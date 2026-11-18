# Benchmark Completo: Owlbear Rodeo (Docs + Extensions) vs. BuddyRPG

Levantamento técnico e funcional baseado na documentação oficial (`docs.owlbear.rodeo`) e no ecossistema de extensões (`extensions.owlbear.rodeo`), preparado como base para o plano de evolução do **BuddyRPG**.

---

## 1. Salas, Acesso, Permissões e Navegação

### Como funciona no Owlbear Rodeo
- **Salas & Acesso (`Request Access`)**: o Mestre compartilha o link da sala; ao entrar, o jogador informa seu nome e pede acesso ("Ask to Join"), e o GM aceita ou recusa. O GM pode promover jogadores a co-GM ou remover/banir participantes.
- **Permissões Granulares por Tipo de Item**: o GM define globalmente o que jogadores podem manipular (ex.: bloquear edição de `Maps` e `Fog`, liberar `Characters` e `Drawings`) e pode ativar modo **Owner-Only** (jogadores só movem tokens que possuem).
- **Sincronização de Câmera (`Sync View`)**: o GM pode forçar a câmera/zoom de todos os jogadores para focar exatamente na área que ele está olhando (`Ctrl + Alt + S`), ou resetar a visão (`Ctrl + Alt + R`).
- **Modo Foco (`Hide UI`)**: `Ctrl + Shift + H` oculta toda a interface ao redor do tabuleiro para máxima imersão.

### Atalhos de Teclado de Referência
| Categoria | Atalho | Ação |
|---|---|---|
| Ferramentas | `Q` | Pointer (Ponteiro Laser) — ou segurar botão direito |
| Ferramentas | `W` | Move / Hand (Pan no mapa) |
| Ferramentas | `S` | Select (`R` retângulo, `L` laço) |
| Ferramentas | `D` | Draw (`B` pincel, `L` linha, `R` retângulo, `C` círculo, `P` polígono) |
| Ferramentas | `M` | Measure / Ruler (`R` régua persistente, `M` distância de movimento) |
| Ferramentas | `T` | Text Tool |
| Ferramentas | `F` | Fog of War |
| Ações no Item | `H` / `L` | Ocultar (`Hide`) / Travar (`Lock`) item |
| Ações no Item | `Ctrl + D` / `Del` | Duplicar / Excluir |
| Ações no Item | `Z` | Editar vértices/nós vetoriais de um desenho ou forma |
| Cena / UI | `Ctrl + G` / `Ctrl + O` | Configurar Grade / Abrir Cenas |
| Cena / UI | `Ctrl + Z` / `Ctrl + Shift + Z` | Desfazer / Refazer |
| Seleção | `Shift + Clique` / `Ctrl + Clique` | Multi-seleção / Selecionar item travado (`Locked`) |

---

## 2. Cenas, Grade e Alinhamento de Mapas

### Como funciona no Owlbear Rodeo
- **Cenas Independentes**: cada cena guarda seu próprio mapa, configuração de grade, tokens, desenhos, textos e névoa de guerra.
- **Tipos de Grade**: Quadrada, Hexagonal e Isométrica, com escala configurável (ex.: `1.5m` ou `5ft` por célula) e opacidade/cor.
- **Alinhamento de Mapa em 3 Passos (`Align Image`)**:
  1. **Offset**: lupa com mira para travar o ponto inicial exato do grid da imagem.
  2. **Size**: ajustar o tamanho de um bloco de células para casar com a grade do VTT.
  3. **Refine**: ajuste fino nas extremidades do mapa para evitar deslocamento acumulado (*grid drift*) em mapas grandes.
- **Snap Override**: opção de desligar ou contornar temporariamente o snap na grade para posicionamento livre pixel a pixel.

---

## 3. Camadas (Layers), Tokens, Montarias e Vínculos (Attachments)

### Hierarquia de Camadas (de baixo para cima)
1. **Maps**: imagem de fundo do cenário.
2. **Props**: objetos de cenário, móveis, armadilhas ou efeitos estáticos no chão (ficam abaixo dos personagens).
3. **Mounts**: montarias/veículos sobre os quais personagens podem subir.
4. **Characters**: PCs, NPCs e monstros.
5. **Attachments**: auras, anéis de status, barras de vida, textos ou moldes presos a um token.
6. **Drawings & Text**: anotações livres e etiquetas no tabuleiro.
7. **Fog of War**: camada superior que cobre áreas não reveladas para os jogadores.

### Recursos de Tokens & Attachments
- **Attachments (Vínculos)**: qualquer item (aura, anel colorido, área de magia, texto) pode ser vinculado manualmente a um token pai (`Attach`). Ao mover, rotacionar ou redimensionar o token pai, todos os anexos acompanham juntos.
- **Lock (`L`)**: travar um anexo ou mapa evita que o usuário arraste o item errado por acidente ao tentar clicar no token.
- **Replace Image**: trocar a arte do token mantendo tamanho, posição, rotação, HP e anexos.

---

## 4. Névoa de Guerra (Fog of War)

### Fog Estática (Nativa)
- **Formas de Desenho**: Retângulo, Círculo, Polígono e Pincel livre para cobrir ou revelar salas.
- **Operações Booleanas de Névoa**:
  - **Fit**: encaixa a nova forma rente às existentes sem sobrepor.
  - **Trim**: recorta/subtrai a área desenhada da névoa existente (revela áreas).
  - **Join**: une formas sobrepostas em um único polígono contínuo.
  - **Overlay**: sobrepõe uma nova camada de névoa sem alterar as de baixo.
- **Forecast & Slice**:
  - *Forecast*: detecção automática de paredes/salas em mapas para gerar névoa em segundos.
  - *Slice*: ferramenta de corte por linha reta entre cantos/paredes para dividir ou corrigir polígonos de névoa manualmente.

### Fog Dinâmica & Linha de Visão (Extensão *Smoke & Spectre!*)
- **Paredes e Portas**: o GM traça linhas de bloqueio de visão (`Walls`) e portas interativas (abertas/fechadas).
- **Fontes de Luz e Visão**: tokens recebem raio de visão (ex.: 18m, visão no escuro) ou fontes de luz (tochas, lanternas) que revelam dinamicamente o mapa conforme o token se move.
- **Spectres (Visibilidade Seletiva)**: itens/tokens visíveis apenas para jogadores específicos (ex.: alucinações, inimigos furtivos detectados só por um personagem).

---

## 5. Ferramentas de Interação em Tempo Real

- **Pointer / Laser Ping (`Q` ou Botão Direito)**:
  - Ao segurar/mover, desenha um ponteiro/pulso luminoso na cor e com o nome do usuário, sincronizado em tempo real para toda a mesa.
- **Ruler / Régua Persistente (`M`)**:
  - Mede distâncias em tempo real com indicação numérica central e divisões por célula.
  - Pode permanecer fixa no mapa após soltar o mouse para planejamento tático (e ser movida/apagada depois).
- **Drawing Tools (`D`)**:
  - Pincel livre, linha reta, retângulo, círculo, triângulo, hexágono e polígono com preenchimento e opacidade configuráveis (excelente para marcar áreas de magia como *Bola de Fogo*, *Cone de Frio* e *Raio*).
  - **Auto-detecção de formas** e **edição de nós (`Z`)**.
- **Text Tool (`T`)**:
  - Caixas de texto redimensionáveis e rotacionáveis diretamente no mapa para nomear locais, armadilhas ou notas rápidas.

---

## 6. Efeitos Visuais, Clima, Combate e Extensões Populares

| Extensão | Categoria | Efeitos Visuais e Funcionalidades |
|---|---|---|
| **Smoke & Spectre!** | Visão / Fog Dinâmica | Linha de visão (raycasting), sombras dinâmicas, tochas/luzes, portas e tokens locais (*spectres*). |
| **Weather** | Clima / Atmosfera | Partículas animadas de **chuva, neve, nuvens, neblina e fumaça colorida**, podendo ser aplicadas ao mapa todo ou confinadas a áreas específicas. |
| **Embers** | Partículas / VFX | Partículas brilhantes (brasas de fogo, faíscas, poeira mágica, fumaça) para zonas de lava, incêndios, portais e áreas arcanas. |
| **Colored Rings** | Tokens / Combate | Anéis coloridos ao redor/abaixo dos tokens para diferenciar inimigos duplicados (ex.: Goblin 1 vermelho, Goblin 2 azul) ou facções. |
| **Owl Trackers** | Tokens / Status | Barras extras (HP, Mana, Escudo), contadores e checkboxes exibidos diretamente sobre o token no tabuleiro. |
| **Clash! / Pretty Sordid** | Combate / Iniciativa | Rastreador de iniciativa avançado com ordem de turno, rodadas, HP, condições e consulta rápida de monstros. |
| **Outliner** | Organização | Painel lateral com árvore de camadas e busca rápida para localizar qualquer token/prop/desenho na cena. |
| **Dice / Dice+** | Dados | Rolagem de dados 3D sincronizada na tela com fórmulas customizadas. |
| **Kenku FM** | Áudio | App complementar para tocar músicas ambiente e efeitos sonoros (soundboard) para a mesa. |

---

## 7. Comparativo: Owlbear Rodeo vs. BuddyRPG Atual

| Recurso | Owlbear Rodeo | BuddyRPG (Atual) | Lacuna / Oportunidade |
|---|---|---|---|
| **Cenas & Grade** | Múltiplas cenas, grade quadrada/hex/iso, *Align Image* 3 passos | Múltiplas cenas, grade quadrada, ajuste numérico manual | Falta alinhamento visual de grid, tipos hex/iso e *Snap Override* |
| **Tokens & Camadas** | 7 camadas, *Attachments*, *Lock*, *Replace Image*, *Colored Rings* | Camada única de tokens, *is_hidden* (GM), condições em texto, barra de HP | Faltam camadas (Props/Mounts), *Attachments*/Auras e anéis coloridos |
| **Névoa de Guerra** | Estática (formas + Trim/Join/Forecast/Slice) + Dinâmica (luz/paredes) | **Não possui** | Alta prioridade: começar com Fog Estática (retângulos/polígonos/revelar) e evoluir para Luz/Visão |
| **Pointer / Ping** | Ponteiro laser em tempo real com nome/cor (`Q` / botão direito) | **Não possui** | Ganho muito rápido via Realtime broadcast (similar à Régua) |
| **Régua** | Tempo real + opção de permanecer fixa no mapa | Tempo real efêmera (Chebyshev/Euclidiana/Alternada) | Permitir fixar/apagar réguas planejadas |
| **Desenho & Magias** | Pincel, formas, polígonos, texto, templates AoE | **Não possui** | Adicionar camada de Desenho/Texto e Templates de Magia (círculo/cone/linha) |
| **Efeitos Visuais (VFX)** | *Weather* (chuva/neve/neblina), *Embers* (partículas), WebM | Dado 3D em Three.js + WebAudio sintetizado | Adicionar camada de partículas/clima no Canvas e efeitos de aura/magia |
| **Fichas & Chat** | Focado apenas no tabuleiro (fichas ficam em extensões/fora) | **Diferencial BuddyRPG**: Ficha D&D/Custom completa integrada, cadeado do GM, chat com rolagem auditada no servidor | Manter e aprofundar a integração Ficha <-> Token <-> Tabuleiro |
