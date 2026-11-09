import { type ClientMessage, type ServerMessage, ServerMessageSchema } from '@manilha/protocol';

export type ConnectionStatus = 'offline' | 'connecting' | 'online';

export interface NetHandlers {
  onMessage: (message: ServerMessage) => void;
  onStatus: (status: ConnectionStatus) => void;
  onOpen?: () => void;
  onClose?: () => void;
}

export class Net {
  private socket: WebSocket | null = null;
  private queue: ClientMessage[] = [];
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private attempts = 0;
  private manuallyClosed = false;
  private readonly url: string;

  constructor(private readonly handlers: NetHandlers) {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    this.url = `${protocol}//${window.location.host}/ws`;
  }

  connect(): void {
    if (
      this.socket &&
      (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }
    this.manuallyClosed = false;
    this.handlers.onStatus('connecting');
    const socket = new WebSocket(this.url);
    this.socket = socket;

    socket.addEventListener('open', () => {
      this.attempts = 0;
      this.handlers.onStatus('online');
      this.handlers.onOpen?.();
      const pending = [...this.queue];
      this.queue = [];
      for (const message of pending) {
        this.send(message);
      }
    });

    socket.addEventListener('message', (event) => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(String(event.data));
      } catch {
        return;
      }
      const message = ServerMessageSchema.safeParse(parsed);
      if (message.success) {
        this.handlers.onMessage(message.data);
      }
    });

    socket.addEventListener('close', () => {
      if (this.socket === socket) {
        this.socket = null;
      }
      this.handlers.onStatus('offline');
      this.handlers.onClose?.();
      if (!this.manuallyClosed) {
        this.scheduleReconnect();
      }
    });

    socket.addEventListener('error', () => {
      socket.close();
    });
  }

  send(message: ClientMessage): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message));
      return;
    }
    this.queue.push(message);
    this.connect();
  }

  close(): void {
    this.manuallyClosed = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.socket?.close();
    this.socket = null;
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      return;
    }
    this.attempts += 1;
    const delay = Math.min(6000, 400 * 2 ** Math.min(this.attempts, 4));
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }
}
