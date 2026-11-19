# Guia de Uso — BuddyRPG (Mestre e Jogadores)

Este guia resume como utilizar os recursos do **BuddyRPG** durante uma sessão de RPG.

---

## 1. Criando ou Entrando em uma Campanha

1. **Cadastro / Login:** Acesse `/login`, crie sua conta com e-mail, senha e nome de usuário (ou entre se já tiver cadastro).
2. **Criar Mesa (Mestre/GM):**
   - No `/dashboard`, preencha o título da campanha em **Nova Campanha** e clique em **Criar Mesa**.
   - Você será definido automaticamente como **Mestre (GM)** e uma **Cena Principal** já estará pronta.
3. **Convidar Jogadores:**
   - Na tela da campanha (ou no card do Dashboard), copie o **Código de Convite** de 8 caracteres (ex.: `A1B2C3D4`) ou o **Link Direto de Convite** (`/join/A1B2C3D4`).
4. **Entrar na Mesa (Jogador):**
   - O jogador acessa o link enviado pelo Mestre ou digita o código de 8 caracteres em **Entrar com Código** no `/dashboard`.

---

## 2. Tabuleiro Interativo, Atalhos e Cenas

### Atalhos de Teclado no Tabuleiro
| Tecla | Ação |
|---|---|
| `V` | Ferramenta **Selecionar / Mover Token** |
| `H` | Ferramenta **Mão (Pan)** para arrastar o mapa |
| `R` | Ferramenta **Régua** para medir distância (compartilhada em tempo real) |
| `F` | Ferramenta **Névoa de Guerra** (modalidades *Some de vez* ou *Raio de Visão*) |
| `E` | Ferramenta **Escuridão & Iluminação** (modalidades *Some de vez* ou *Raio de Visão*) |
| `C` | Ferramenta **Clima & Anoitecer** (efeitos combináveis na cena toda ou por bloco) |
| `0` | Resetar zoom (`100%`) e centralizar câmera |
| `Espaço` *(segurar)* | Ativa **Pan temporário** enquanto pressionada |
| `Delete` | Remove o token selecionado (pede confirmação) |

- **Zoom:** Use a roda do mouse (*scroll*) para aproximar ou afastar o mapa no ponto do cursor.
- **Pan (Mover câmera):** Segure o **botão do meio do mouse**, ou segure a tecla **Espaço** e arraste, ou selecione a ferramenta **Mão (Pan)** na barra de ferramentas.
- **Régua de Medição:** Selecione a ferramenta **Régua** e arraste entre dois pontos do mapa para medir a distância em **quadrados** e em **metros** em tempo real (visível para os participantes da sala).
- **Gerenciamento de Cenas & Forja de Mapas de Faerûn (Exclusivo do Mestre):**
  - Crie novas cenas ocultas (`is_active = false`), envie imagens de mapa (PNG/JPG/WebP até 10 MB) ou clique em **✨ Abrir Forja / Gerador de Mapas**:
    1. **Forja Procedural (2D Instantâneo):** Gere masmorras de pedra (*Undermountain*), cavernas bioluminescentes (*Underdark*), trilhas na *Floresta de Cormyr* ou o salão de uma *Taverna de Águas Profundas* alinhados à grade e salvos direto no Supabase Storage.
    2. **Presets Clássicos de Forgotten Realms:** Carregue encontros prontos em 1 clique.
    3. **IA Gratuita por Prompt & Importador de URL:** Gere um battlemap *top-down* descrevendo a cena em português ou cole o link de qualquer mapa da internet.
  - Clique em **Ativar Cena** quando quiser transportar todos os jogadores para aquele mapa.
- **Dados 3D sobre o Tabuleiro:**
  - Sempre que alguém rola dados no chat ou clica em um botão `🎲` na ficha, poliedros 3D (`d4`, `d6`, `d8`, `d10`, `d12`, `d20`, `d100`) são arremessados sobre o mapa em tempo real para toda a sala (com brilho especial em **20 Natural** e **1 Natural**). Você pode ligar/desligar a animação no botão **🎲 3D ON/OFF** da barra do tabuleiro.

---

## 3. Tokens em Tempo Real

- **Permissões:**
  - O **Mestre** pode criar, editar, alterar HP e arrastar **qualquer** token.
  - O **Jogador** pode criar tokens próprios e arrastar/ajustar HP apenas dos tokens vinculados a ele ou ao seu personagem.
- **Sincronização:** Enquanto alguém arrasta um token, todos veem o movimento deslizando em tempo real; ao soltar na grade, a posição final fica salva no banco de dados.

---

## 4. Chat e Comandos de Dados (`/roll` e `/r`)

No painel lateral de **Chat**, digite mensagens normais ou comandos de rolagem:

- `/roll 1d20+5` ou `/r 1d20+5` → Rola 1 dado de 20 faces e soma 5.
- `/r 2d6 Espada Longa` → Rola 2d6 com o rótulo *"Espada Longa"*.
- `/r 4d6kh3 Atributo` → Rola 4d6 e mantém os **3 maiores** (*keep highest 3*), exibindo o dado descartado riscado.
- `/r 2d20kl1 Desvantagem` → Rola 2d20 e mantém o **menor** (*keep lowest 1*).
- `/r 1d%` → Rola 1d100 (percentual).

Todas as rolagens são calculadas no servidor com gerador criptográfico (`crypto.randomInt`), impedindo manipulação pelo navegador.

---

## 5. Fichas de Personagem Privadas e Cadeado do Mestre (`🔒`)

- **Privacidade:** Cada ficha é visível **apenas para o seu dono e para o Mestre**. Outros jogadores não têm acesso aos dados da sua ficha.
- **Preenchimento Inicial:** Ao criar uma nova ficha, ela nasce **liberada para edição** (`player_can_edit = true`) para que o jogador preencha seus atributos, nível, inventário e anotações.
- **Bloqueio / Liberação pelo Mestre:**
  - O Mestre vê todas as fichas da campanha e possui um botão de **Cadeado (`🔒 Bloquear / 🔓 Liberar Edição`)** em cada ficha.
  - Quando bloqueada pelo Mestre, o jogador continua visualizando sua ficha em tempo real, mas não pode alterar seus valores até que o Mestre libere novamente.
- **Rolagem de Atributo em 1 Clique (`🎲`):**
  - Dentro do modal da ficha, cada atributo exibe automaticamente seu modificador (ex.: `Força 16 → Mod +3`) e um botão **`🎲`** ao lado. Ao clicar nele, o servidor rola `/r 1d20+3 Força (Nome)` e publica o resultado instantaneamente no Chat da campanha (funciona mesmo quando a ficha está bloqueada para edição).
- **Vínculo Token ↔ Ficha:**
  - Ao criar um token na aba **Tokens**, você pode vinculá-lo a uma ficha de personagem. Quando esse token for selecionado no tabuleiro, a barra flutuante exibirá o botão **Ficha** para abrir a ficha correspondente em 1 clique.
