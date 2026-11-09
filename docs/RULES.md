# Regras de Manilha

Versão 2 (web). Este documento é a fonte de verdade para o engine e para os testes.

## 1. Baralho

- 40 cartas: `A, 2, 3, 4, 5, 6, 7, J, Q, K` nos quatro naipes (`♣ ♦ ♥ ♠`).
- Não existem `8`, `9` nem `10`.
- Cada carta tem um `cardRank` de 1 (mais forte) a 14 (mais fraca).

### Manilhas

| Carta | Rank |
| --- | --- |
| `4♣` (zap) | 1 |
| `7♥` | 2 |
| `A♠` (espadilha) | 3 |
| `7♦` | 4 |

### Demais cartas

| Carta | Rank |
| --- | --- |
| `3` | 5 |
| `2` | 6 |
| `A` (fora de espadas) | 7 |
| `K` | 8 |
| `J` | 9 |
| `Q` | 10 |
| `7` (fora de copas/ouros) | 11 |
| `6` | 12 |
| `5` | 13 |
| `4` (fora de paus) | 14 |

**Menor `cardRank` vence.**

## 2. Jogadores e assentos

- 2 a 6 jogadores por sala.
- Assentos são numerados e a ordem é sempre crescente, com wrap-around.
- Bots ocupam assentos normais e são tratados como jogadores.
- Jogador morto permanece na sala como espectador até o fim da partida.

## 3. Início

- O host inicia a partida com pelo menos 2 jogadores (humanos e/ou bots).
- O dealer inicial é o host.
- Rodada inicial: 1.

## 4. Cartas na mão

A quantidade de cartas distribuidas em cada rodada é:

```
cartas = min(rodada, 7, floor(40 / jogadores vivos))
```

Exemplos:

| Jogadores vivos | Rodada 1 | Rodada 6 | Rodada 7 |
| --- | --- | --- | --- |
| 2 | 1 | 6 | 7 |
| 4 | 1 | 6 | 7 |
| 5 | 1 | 6 | 7 |
| 6 | 1 | 6 | 6 |

O baralho é embaralhado no servidor a cada rodada. Não há cartas repetidas.

## 5. Apostas

- Cada jogador aposta de `0` até o número de cartas da mão.
- A ordem de aposta começa no próximo jogador após o dealer.
- **O dealer aposta por último.**
- O dealer não pode fazer a soma total das apostas ficar **igual** ao número de cartas da rodada.
  - Se a soma dos outros já for maior que o número de cartas, qualquer aposta do dealer é válida.
- A soma total pode ser maior que o número de cartas; só a igualdade é proibida.
- Depois da aposta do dealer, começa a fase de jogo.

## 6. Jogo e fez

- Não há obrigação de seguir naipe. Qualquer carta da mão é jogada válida.
- A primeira jogada da rodada é do próximo jogador após o dealer.
- Cada jogador joga exatamente uma carta por fez.
- Quando todos os jogadores vivos jogaram, o fez é resolvido:
  - vence a carta de menor `cardRank`;
  - se houver empate no menor rank, **vence a última carta jogada entre as empatadas**;
  - o empate é exibido como **“melou”**.
- O vencedor do fez abre o próximo fez.
- A mesa mostra as cartas jogadas por 1,4 s; depois o servidor limpa a mesa e começa o próximo fez.

## 7. Fim da rodada

- A rodada termina depois de `cartas` fez.
- Cada jogador compara quantos fez ganhou com a própria aposta:
  - acertou → mantém as vidas;
  - errou → perde 1 vida.
- Quem chega a 0 vidas morre e vira espectador.
- Todos os jogadores vivos precisam confirmar o resultado.
- Depois de todas as confirmações:
  - o dealer passa para o próximo jogador vivo após o dealer anterior;
  - a rodada incrementa, até o máximo de 7;
  - uma nova rodada começa.
- Se restar apenas 1 jogador vivo, ele vence.
- Se todos morrerem na mesma rodada, a partida termina empatada.

## 8. Tempo

- Aposta e jogada: **35 segundos** por turno.
- Confirmação de fim de rodada: **15 segundos**.
- Ao estourar o tempo:
  - aposta: o servidor escolhe o **menor valor válido**;
  - jogada: o servidor joga a **carta mais fraca** (maior `cardRank`); empate pelo menor índice na mão;
  - confirmação: o servidor confirma automaticamente.
- Os timers congelam durante uma pausa.

## 9. Queda, pausa e votação

- A queda de um **jogador vivo humano** pausa a partida imediatamente.
- A queda de jogador morto ou de espectador externo não pausa.
- Podem votar os humanos conectados que ocupam assento (vivos ou mortos).
- Bots, desconectados e espectadores externos não votam.
- A maioria é **mais de 50%** dos votantes elegíveis.
- Opções:
  - **Continuar com bot**: o bot assume os assentos desconectados; o timer retoma com no mínimo 10 s;
  - **Esperar**: a partida continua pausada até a reconexão.
- Sem maioria, continua pausada.
- Se o jogador reconectar antes da decisão, a pausa é desfeita quando não houver mais desconectados.
- Uma nova queda durante a votação reinicia os votos.
- Sair voluntariamente durante a partida faz um bot assumir o assento, sem pausa.
- Se o host cair ou sair, o host passa para o próximo humano conectado. Sem humanos, a sala fica sem host até alguém reconectar.

## 10. Espectadores

### Jogador morto

- Permanece na sala.
- Vê todas as mãos, apostas, fez e resultados.
- Não joga, mas vota em pausas.
- Pode reconectar.

### Espectador externo (link)

- Entra pelo link `/sala/CODIGO` mesmo com a partida em andamento.
- Vê apenas informação pública: mesa, fez, apostas, vidas, contagens e resultados.
- **Não vê as mãos dos jogadores.**
- Não joga, não confirma e não vota.
- Pode sair e reconectar.

## 11. Bots

- Adicionados/removidos pelo host no lobby.
- Apostam no menor valor válido.
- Jogam a carta mais fraca da mão (maior `cardRank`).
- Confirmam imediatamente.
- Não votam, não pausam e não contam como humanos conectados.

## 12. Sala

- Código de 5 caracteres, sem caracteres ambíguos (`I`, `O`, `0`, `1`).
- Máximo de 6 assentos.
- Salas são apenas em memória; reiniciar o servidor encerra tudo.
- Sala vazia é removida após o TTL configurado.
