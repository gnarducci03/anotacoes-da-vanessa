# FEATURES.md — Especificação Completa de Funcionalidades (Experiência GoodNotes para Tablet/Web)

> [!IMPORTANT]
> **Auditoria do Repositório `C:\Users\nardu\rea` vs. Especificação Inferida:**
> Durante a inspeção completa de `C:\Users\nardu\rea`, constatou-se que o repositório clonado (`morluto/rea` — *REA: Reverse Engineer Anything*) é um **framework e servidor MCP genérico de engenharia reversa** (com adaptadores para Ghidra, Hopper, IDA, Frida, APKTool, Mach-O/IPA, Electron e um micro-exemplo didático `website/public/examples/notes-web` de 24 linhas que apenas exporta 2 notas para CSV). **Não há binários, dumps, assets ou código do GoodNotes dentro de `C:\Users\nardu\rea`.**
>
> Seguindo estritamente as regras do projeto (*"marcando o que existe no repo e o que for inferido"* e *"Não invente funcionalidades que não estejam no repo ou no GoodNotes; marque o que for suposição"*), todas as funcionalidades abaixo foram **mapeadas fielmente a partir da arquitetura real do GoodNotes 5 / GoodNotes 6 (iPadOS)** e classificadas com as tags:
> - `[REPO-REA]`: Presente no repositório `C:\Users\nardu\rea` (infraestrutura de análise ou exemplo `notes-web`).
> - `[GOODNOTES-SPEC / INFERIDO]`: Funcionalidade autêntica do GoodNotes (iPad/iPhone), inferida por conhecimento de referência da plataforma iPadOS, pois o dump específico do GoodNotes não está em `C:\Users\nardu\rea`.
> - `[WEB-PWA / SUPOSIÇÃO]`: Adaptação necessária para funcionamento nativo no navegador do tablet (Pointer Events API, IndexedDB, Service Worker, File System Access).

---

## 1. Visão Geral das Telas e Fluxos de Navegação

| Tela / Fluxo | Origem | Descrição |
| :--- | :--- | :--- |
| **Biblioteca (Documents / Library View)** | `[GOODNOTES-SPEC / INFERIDO]` | Tela inicial com navegação por abas/sidebar (Documentos, Busca, Favoritos, Compartilhados/Lixeira), breadcrumb de pastas, grade de cadernos/pastas, botão `+` ("Novo...") e modo de seleção múltipla. |
| **Modal de Criação de Caderno (`New Notebook`)** | `[GOODNOTES-SPEC / INFERIDO]` | Seletor de Capa (Covers) e Modelo de Papel (Paper Templates), orientação (Retrato/Paisagem), tamanho da página (A4, A5, Carta, GoodNotes Standard), cor do papel (Branco, Creme/Amarelo, Escuro) e título. |
| **Editor de Documento (Document Workspace)** | `[GOODNOTES-SPEC / INFERIDO]` | Tela principal de escrita com: Top Navigation Bar (voltar, abas de documentos abertos, miniatura/grid de páginas, busca no doc, favoritar página, exportar, adicionar página, mais opções) + Writing Toolbar (ferramentas e barra contextual de propriedades). |
| **Visualizador de Páginas (Thumbnail Grid Modal)** | `[GOODNOTES-SPEC / INFERIDO]` | Modal em grade mostrando miniaturas ao vivo de todas as páginas do caderno, com abas para *Miniaturas (Thumbnails)*, *Favoritos (Favorites)* e *Sumário (Outline)*, permitindo reordenar, duplicar, inserir página antes/depois, rotacionar ou excluir. |
| **Busca Global e Intra-Documento** | `[GOODNOTES-SPEC / INFERIDO]` | Busca por títulos de cadernos/pastas, texto digitado (Text Boxes), índice de PDF importado e notas textuais. |
| **Exportação Rápida (JSON/CSV/PDF)** | `[REPO-REA]` + `[GOODNOTES-SPEC / INFERIDO]` | O exemplo `notes-web` em `rea` implementa exportação em Blob download; no app completo, expandimos para exportação de Página Atual ou Documento Inteiro em PDF (achatado com anotações via `pdf-lib`), Imagem (PNG) ou Backup nativo (`.inknote` / `.json`). |

---

## 2. Biblioteca, Pastas e Organização (Etapa 1)

### 2.1. Estrutura Hierárquica
- `[GOODNOTES-SPEC / INFERIDO]` **Pastas Ilimitadas (Nested Folders)**: Pastas dentro de pastas com navegação via *Breadcrumb* no topo (`Documentos > Faculdade > Cálculo I`).
- `[GOODNOTES-SPEC / INFERIDO]` **Cadernos (Notebooks)**: Documentos multipágina com capa personalizável e páginas independentes (cada página pode ter seu próprio template de papel ou página de PDF).
- `[GOODNOTES-SPEC / INFERIDO]` **Nota Rápida (Quick Note)**: Toque duplo no botão `+` cria imediatamente um caderno sem título com o template padrão configurado.

### 2.2. Operações de Gerenciamento (CRUD)
- `[GOODNOTES-SPEC / INFERIDO]` **Criar**: Pasta, Caderno, Importar (PDF/Imagem/Backup), Nota Rápida.
- `[GOODNOTES-SPEC / INFERIDO]` **Renomear**: Toque no título do caderno/pasta na biblioteca ou direto no cabeçalho do editor.
- `[GOODNOTES-SPEC / INFERIDO]` **Mover**: Modal de árvore de diretórios para transferir cadernos ou pastas para outra pasta.
- `[GOODNOTES-SPEC / INFERIDO]` **Duplicar**: Clona um caderno inteiro (incluindo páginas, traços e PDF base).
- `[GOODNOTES-SPEC / INFERIDO]` **Favoritar (Star)**: Marca cadernos, pastas ou páginas específicas como favoritos para acesso rápido na aba *Favoritos*.
- `[GOODNOTES-SPEC / INFERIDO]` **Lixeira (Trash) & Exclusão**: Mover para lixeira, restaurar ou excluir permanentemente.
- `[GOODNOTES-SPEC / INFERIDO]` **Visualização e Ordenação**: Alternar entre visualização em **Grade (Grid)** (padrão com capas visíveis) e **Lista (List)** (detalhes de data/tamanho); ordenar por *Data de Modificação*, *Nome* ou *Tipo*.

### 2.3. Capas de Caderno (Covers)
- `[GOODNOTES-SPEC / INFERIDO]` **Estilos de Capas Vetoriais Próprias**:
  1. *Sólida Clássica (Classic Kraft / Leather)*: Marrom Kraft, Preto Ônix, Azul Marinho, Verde Sálvia, Terracota, Vinho.
  2. *Minimalista c/ Faixa Lateral (Spine Band)*: Tons pastel (Lavanda, Menta, Pêssego, Azul Gelo, Cinza Quente).
  3. *Acadêmica / Técnica*: Grade sutil com etiqueta central de título e subtítulo.
  4. *Sem Capa*: A própria primeira página serve de miniatura na biblioteca.

---

## 3. Ferramentas de Escrita e Edição (Etapas 2 e 3)

Todas as ferramentas ficam alojadas na **Writing Toolbar** centralizada (ou acoplada ao topo, estilo GoodNotes 5/6), acompanhadas no lado direito por **3 slots de cores rápidas** e **3 slots de espessuras de traço** (ou opções contextuais da ferramenta ativa).

### 3.1. Caneta (Pen Tool) — `[GOODNOTES-SPEC / INFERIDO]`
Três estilos de ponta com física de traço distinta (implementados via `perfect-freehand` + Pointer Events):
1. **Caneta Tinteiro (Fountain Pen)**: Alta sensibilidade à pressão (`pressure`), gerando variação orgânica de espessura nas curvas. Configuração de nitidez da ponta e sensibilidade à pressão.
2. **Caneta Esferográfica (Ball Pen)**: Espessura uniforme (ignora variação de pressão), ideal para diagramas técnicos ou escrita uniforme.
3. **Caneta Pincel (Brush Pen)**: Variação extrema de pressão e afinamento (*taper*) no início/fim do traço, ideal para *lettering* e títulos (Caligrafia).
- **Propriedades**:
  - 3 slots de espessura personalizáveis (`0.1mm` a `2.0mm`, ex.: Fina `1.5px`, Média `3.5px`, Grossa `6.5px`).
  - 3 slots de cores rápidas na barra + paleta completa + seletor HEX/RGB.
  - *Hold to Snap Shape* (Segurar ao final do traço por 400ms converte automaticamente linha/círculo/retângulo/triângulo em forma geométrica perfeita).

### 3.2. Marca-Texto (Highlighter) — `[GOODNOTES-SPEC / INFERIDO]`
- Renderizado em **camada abaixo da tinta da caneta** (com `globalCompositeOperation = 'multiply'` no modo claro ou opacidade translúcida controlada) para **nunca ofuscar o texto do PDF ou a tinta preta da caneta**.
- Ponta chanfrada/redonda uniforme.
- Opção **"Desenhar em Linha Reta" (Draw in Straight Line)**: Achata automaticamente o traço horizontal/vertical para grifar textos de PDF com perfeição.
- 3 slots de espessura (ex.: `12px`, `20px`, `32px`) e 3 slots de cores neon/pastel (Amarelo, Rosa, Verde, Azul, Laranja, Lilás).

### 3.3. Borracha (Eraser Tool) — `[GOODNOTES-SPEC / INFERIDO]`
Três modos de operação idênticos ao GoodNotes:
1. **Borracha de Traço Inteiro (Stroke Eraser)**: Ao tocar em qualquer ponto de um traço, remove o traço inteiro imediatamente.
2. **Borracha de Precisão (Precision / Pixel Eraser)**: Divide ou apaga apenas o segmento atingido pelo raio da borracha.
3. **Opções Contextuais**:
   - *Apagar Apenas Marca-Texto (Erase Highlighter Only)*: Permite apagar grifos sem destruir a escrita à caneta que está por cima.
   - *Desselecionar Automaticamente (Auto-Deselect)*: Volta automaticamente para a última ferramenta usada (ex: Caneta) assim que o usuário levanta a stylus após apagar.
   - *Limpar Página Inteira (Clear Page)*: Ação rápida no popover da borracha.
   - 3 tamanhos de raio (`Pequena 12px`, `Média 28px`, `Grande 56px`).

### 3.4. Ferramenta de Formas (Shapes Tool) — `[GOODNOTES-SPEC / INFERIDO]`
- Reconhecimento automático ou desenho direto de:
  - **Linhas Retas e Setas**
  - **Retângulos / Quadrados**
  - **Círculos / Elipses**
  - **Triângulos / Polígonos**
- Opção de **Preenchimento de Cor Translúcido (Fill Color)** automático nas formas fechadas.
- Alças de edição (*control points*) pós-desenho para ajustar vértices ou redimensionar.

### 3.5. Ferramenta Laço (Lasso Tool) — `[GOODNOTES-SPEC / INFERIDO]`
- Seleção à mão livre (polígono fechado tracejado animado) ou retangular.
- Filtros do que incluir na seleção (configuráveis no popover do Laço):
  - `[x] Escrita à Mão (Handwriting)`
  - `[x] Imagens (Images)`
  - `[x] Caixas de Texto (Text Boxes)`
  - `[x] Formas (Shapes)`
- **Menu Contextual Flutuante (Object Popover)** ao tocar na seleção:
  - **Mover / Arrastar** livremente pela página.
  - **Redimensionar e Rotacionar** (alça única combinada ou alças de canto).
  - **Mudar Cor (Color)**: Altera a cor de todos os traços/formas selecionados.
  - **Capturar Imagem (Take Screenshot)**: Exporta a região selecionada como PNG/Clipboard.
  - **Cortar / Copiar / Duplicar / Excluir**.
  - **Trazer para Frente / Enviar para Trás**.

### 3.6. Ferramenta de Texto (Text Box Tool) — `[GOODNOTES-SPEC / INFERIDO]`
- Criação de caixas de texto ricas posicionáveis em qualquer ponto da página.
- Estilização: Família tipográfica (Sans, Serif, Monospace, Handwritten), Tamanho (`10pt` a `72pt`), Alinhamento (Esquerda, Centro, Direita), Negrito/Itálico, Cor do Texto, Cor de Fundo da Caixa e Borda (com raio de canto).
- Salvar estilo favorito ("Salvar como Padrão").

### 3.7. Ferramenta de Imagem e Adesivos/Elementos (Image & Elements) — `[GOODNOTES-SPEC / INFERIDO]`
- Inserir imagem da galeria/arquivos do tablet ou colar da área de transferência.
- Redimensionamento proporcional, rotação livre e **Corte (Crop)** retangular ou à mão livre.
- **Coleção de Elementos (Stickers / Carimbos Vetoriais)**: Conjunto embutido de adesivos úteis de estudo (Post-its, Fitas Washi, Marcadores de Importante/Dúvida/Prova, Diagramas básicos) que podem ser carimbados na página.

### 3.8. Apontador Laser (Laser Pointer - Modo Apresentação) — `[GOODNOTES-SPEC / INFERIDO]`
- Ferramenta na extremidade direita da barra:
  - Modo **Ponto (Dot)** ou **Trilha Temporária (Trail)** que brilha em vermelho neon e desaparece suavemente após `1.2s` sem sujar o documento.

### 3.9. Janela de Zoom (Zoom Window - Escrita de Precisão) — `[GOODNOTES-SPEC / INFERIDO]` `[SUPOSIÇÃO DE PRIORIDADE]`
- Recurso clássico do GoodNotes para escrita pequena em tablets: abre um painel inferior ampliado (`200%–300%`) sincronizado com uma caixa-alvo azul na página, com avanço automático de margem (*auto-advance*) enquanto você escreve até o fim da linha.

---

## 4. Templates de Papel e Páginas (Etapa 2)

`[GOODNOTES-SPEC / INFERIDO]` Todos os templates são renderizados vetorialmente em alta definição (Canvas/SVG) para nitidez infinita em qualquer nível de zoom:

### 4.1. Cores de Papel
1. **Branco Puro (White)**: `#FFFFFF` (linhas `#CBD5E1` / margem `#FCA5A5`)
2. **Amarelo / Creme Conforto Visual (Yellow / Cream)**: `#FBF7EC` (linhas `#D6CEBF` / margem `#E5989B`) — assinatura visual do GoodNotes.
3. **Escuro / Ardósia (Dark Paper)**: `#1C1C1E` (linhas `#38383A` / margem `#636366`).

### 4.2. Layouts de Papel (Retrato e Paisagem)
1. **Em Branco (Blank)**
2. **Pautado Estreito (Ruled Narrow - 7mm)** c/ cabeçalho e linha de margem vertical.
3. **Pautado Largo (Ruled Wide - 9mm)** c/ cabeçalho e linha de margem vertical.
4. **Método Cornell (Cornell Notes)**: Coluna de tópicos à esquerda, área de notas à direita e bloco de resumo no rodapé.
5. **Quadriculado (Squared / Grid - 5mm)**: Malha quadriculada uniforme para exatas/engenharia.
6. **Pontilhado (Dotted - 5mm)**: Pontos discretos estilo Bullet Journal.
7. **Lista de Tarefas / Checklist**: Linhas com caixas de seleção.
8. **Planejador Semanal / Mensal (Planner)** e **Duas Colunas (Two Columns)**.
9. **Pauta Musical (Music Sheet)** e **Isométrico (Isometric Grid)**.

---

## 5. Importação, Anotação e Exportação de PDF (Etapa 4)

- `[GOODNOTES-SPEC / INFERIDO]` **Importação de PDF com `pdf.js`**:
  - Importar arquivo PDF como **Novo Caderno** ou **Inserir Páginas de PDF** dentro de um caderno existente.
  - Renderização progressiva em alta resolução (adaptada ao `devicePixelRatio` e ao zoom atual do canvas) com cache em memória/offscreen canvas para rolagem fluida.
  - Extração de **Sumário (PDF Outline/Bookmarks)** e camada de texto para **Busca Intra-Documento**.
- `[GOODNOTES-SPEC / INFERIDO]` **Anotação Nativa Sobre PDF**:
  - Todas as ferramentas (Caneta, Marca-Texto com *multiply*, Borracha, Formas, Texto, Imagens) funcionam diretamente sobre cada página do PDF.
  - Possibilidade de inserir uma página de caderno em branco/pautada no meio de duas páginas de um PDF importado (para resolver exercícios ou expandir anotações).
- `[GOODNOTES-SPEC / INFERIDO]` **Exportação de PDF com `pdf-lib`**:
  - Exporta o caderno inteiro ou páginas selecionadas gerando um PDF vetorial/alta-resolução contendo tanto o fundo original (PDF ou Template de Papel) quanto todos os traços, marca-textos, textos e imagens desenhados.

---

## 6. Gestos de Toque, Caneta (Stylus) e Atalhos (Etapas 2 e 5)

| Interação / Gesto | Origem | Comportamento no Tablet / Web |
| :--- | :--- | :--- |
| **Stylus vs. Toque (Palm Rejection & Finger Mode)** | `[WEB-PWA / SUPOSIÇÃO]` + `[GOODNOTES-SPEC]` | Detecção automática via `PointerEvent.pointerType === 'pen'`. Quando uma stylus é detectada (ou quando a opção *"Desenhar apenas com Caneta"* está ativa), 1 dedo faz Pan/Scroll sem riscar a página, e a palma da mão é ignorada. |
| **Pinça com 2 Dedos (Pinch-to-Zoom & Pan)** | `[GOODNOTES-SPEC / INFERIDO]` | Zoom contínuo de `50%` a `500%` centrado no ponto médio entre os dedos, acompanhado de translação suave. |
| **Toque Duplo com 2 Dedos** | `[GOODNOTES-SPEC / INFERIDO]` | **Desfazer (Undo)** imediato. |
| **Toque Duplo com 3 Dedos** | `[GOODNOTES-SPEC / INFERIDO]` | **Refazer (Redo)** imediato. |
| **Segurar ao Final do Traço (400ms)** | `[GOODNOTES-SPEC / INFERIDO]` | Converte o traço à mão livre em **Forma Geométrica Perfeita** (Linha, Círculo, Retângulo, Triângulo) mantendo a caneta pressionada para redimensionar. |
| **Rabiscar para Apagar (Scribble to Erase)** | `[GOODNOTES-SPEC / INFERIDO]` | (Opcional/Toggle) Rabiscar rapidamente em ziguezague sobre uma palavra com a caneta apaga os traços cobertos. |
| **Direção de Rolagem (Vertical vs. Horizontal)** | `[GOODNOTES-SPEC / INFERIDO]` | Alternância entre rolagem contínua vertical ou paginação horizontal estilo livro. |
| **Modo Somente Leitura (Read-Only / Navigation Mode)** | `[GOODNOTES-SPEC / INFERIDO]` | Ícone na barra superior que oculta a barra de ferramentas de escrita, evita toques acidentais e ativa links internos. |
| **Atalhos de Teclado (Teclado Bluetooth / Desktop)** | `[WEB-PWA / SUPOSIÇÃO]` | `P` (Caneta), `H` (Marca-texto), `E` (Borracha), `S` (Formas), `L` (Laço), `T` (Texto), `Ctrl/Cmd+Z` (Desfazer), `Ctrl/Cmd+Shift+Z` (Refazer), `Delete/Backspace` (Excluir seleção), `Espaço+Arrastar` (Pan). |

---

## 7. PWA, Offline e Persistência Local (Etapas 1, 2 e 6)

- `[WEB-PWA / SUPOSIÇÃO]` **Persistência Local 100% Offline (`Dexie.js` / IndexedDB)**:
  - Autosave instantâneo com *debounce* de 300ms a cada traço adicionado/removido.
  - Armazenamento separado de binários pesados (`pdfBlobs`, `imageBlobs`) e vetores de páginas (`pages`, `strokes`, `elements`) para abrir cadernos de 100+ páginas em milissegundos.
- `[WEB-PWA / SUPOSIÇÃO]` **Backup / Exportação e Restauração (`.inknote` JSON/ZIP)**:
  - Como os dados ficam no IndexedDB do tablet, o usuário pode exportar/importar backups completos a qualquer momento.
- `[WEB-PWA / SUPOSIÇÃO]` **PWA Instalável em Tela Cheia (`display: standalone`)**:
  - `manifest.webmanifest` configurado com orientação flexível, ícones Apple Touch (`apple-mobile-web-app-capable`), prevenção de gestos nativos do navegador (`touch-action: none` no canvas, bloqueio de *pull-to-refresh* e *pinch-zoom* da página HTML).
  - Service Worker para funcionamento offline total no tablet.
