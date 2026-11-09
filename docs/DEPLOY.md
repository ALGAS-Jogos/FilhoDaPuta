# Deploy em subdomínio

Alvo: um subdomínio, por exemplo `https://manilha.seudominio.com`, apontando para o IP fixo do
servidor. O app roda em Docker Compose e escuta apenas em `127.0.0.1:3000`; o Apache/httpd existente
termina TLS e faz proxy HTTP + WebSocket.

## 1. DNS e TLS

1. Crie um registro `A` para `manilha.seudominio.com` no IP fixo.
2. Emita o certificado no servidor (Certbot ou o fluxo que você já usa):

```bash
sudo certbot --apache -d manilha.seudominio.com
```

3. Libere apenas `80/tcp` e `443/tcp` no firewall. A porta `3000` fica em loopback.

## 2. Configuração

```bash
cp .env.example .env
```

Edite `.env`:

```dotenv
PUBLIC_ORIGIN=https://manilha.seudominio.com
LOG_LEVEL=info
MAX_ROOMS=200
ROOM_TTL_MS=1800000
```

`PUBLIC_ORIGIN` precisa bater com a origem do navegador (esquema + host + porta, sem barra final).
Com ele definido, o servidor rejeita WebSocket de outra origem.

## 3. Subir

```bash
docker compose up -d --build
docker compose ps
docker compose logs -f manilha
```

O healthcheck consulta `GET /healthz`. O container roda como usuário `node`, com filesystem
read-only e `no-new-privileges`.

Teste localmente antes do proxy:

```bash
curl http://127.0.0.1:3000/healthz
# {"ok":true,"rooms":0,"uptime":...}
```

## 4. Apache/httpd

Módulos necessários:

```apache
LoadModule proxy_module modules/mod_proxy.so
LoadModule proxy_http_module modules/mod_proxy_http.so
LoadModule proxy_wstunnel_module modules/mod_proxy_wstunnel.so
```

VirtualHost HTTPS:

```apache
<VirtualHost *:443>
    ServerName manilha.seudominio.com

    SSLEngine on
    SSLCertificateFile      /etc/letsencrypt/live/manilha.seudominio.com/fullchain.pem
    SSLCertificateKeyFile   /etc/letsencrypt/live/manilha.seudominio.com/privkey.pem

    ProxyPreserveHost On
    ProxyTimeout 3600

    # WebSocket primeiro; a ordem importa.
    ProxyPass        "/ws" "ws://127.0.0.1:3000/ws"
    ProxyPassReverse "/ws" "ws://127.0.0.1:3000/ws"

    ProxyPass        "/" "http://127.0.0.1:3000/"
    ProxyPassReverse "/" "http://127.0.0.1:3000/"

    ErrorLog  ${APACHE_LOG_DIR}/manilha-error.log
    CustomLog ${APACHE_LOG_DIR}/manilha-access.log combined
</VirtualHost>
```

Recarregue o Apache:

```bash
sudo apachectl configtest
sudo systemctl reload apache2   # ou httpd, conforme a distro
```

Se estiver usando outro proxy, os pontos obrigatórios são:

- `/ws` com upgrade de WebSocket para `ws://127.0.0.1:3000/ws`;
- `/` para `http://127.0.0.1:3000/`;
- preservar `Host` e encaminhar `X-Forwarded-Proto: https`;
- timeout de proxy maior que o heartbeat de 20 s.

## 5. Validação

```bash
curl -s https://manilha.seudominio.com/healthz
curl -sI https://manilha.seudominio.com/ | head
```

No navegador:

1. abra `https://manilha.seudominio.com`;
2. crie uma sala;
3. copie o link `/sala/CODIGO` e abra em outra janela;
4. adicione bots, inicie e jogue uma rodada;
5. abra o link em uma terceira janela e use **Assistir partida** para conferir a visão pública.

## 6. Atualização

```bash
git pull
docker compose up -d --build
docker compose logs -f --tail=100 manilha
```

## 7. Operação

- Estado em memória: **reiniciar o container encerra as partidas**. Não há banco.
- Salas sem ninguém conectado são removidas após `ROOM_TTL_MS` (padrão 30 min).
- Logs vão para stdout; use `docker compose logs` ou o coletor do host.
- Uma instância só. Escala horizontal exigiria Redis/sticky sessions e não está implementada.
- O cliente é servido pelo próprio Node; não precisa de outro servidor estático.
- `TRUST_PROXY=1` já vem no compose. Mantenha o app em loopback.

## 8. Troubleshooting

| Sintoma | Verificação |
| --- | --- |
| 502 no HTTP | `docker compose ps`; `curl http://127.0.0.1:3000/healthz` |
| WebSocket não conecta | `mod_proxy_wstunnel` ativo? regra `/ws` antes de `/`? |
| “origem não permitida” | `PUBLIC_ORIGIN` igual ao domínio acessado, sem barra final |
| Tela “Servidor offline” | logs do container e console do navegador |
| Reconexão falha | token em `localStorage` (`manilha.session`); sala pode ter expirado |

## 9. Licença

GPL-3.0-or-later. O `LICENSE` do repositório continua valendo.
