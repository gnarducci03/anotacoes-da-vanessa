# UI-SPEC.md — Design System, Tokens e Especificação Visual (Estilo GoodNotes iPadOS)

> [!NOTE]
> Todos os design tokens, cores, tipografia, espaçamentos, sombras e layouts abaixo replicam a estética limpa, tátil e nativa do **GoodNotes (iPadOS)**, utilizando identidade visual, nome (**NoteFlow / InkPad Studio**) e ícones SVG próprios (Lucide + SVGs customizados de pontas de caneta/marca-texto/borracha), sem copiar marcas registradas ou assets proprietários.

---

## 1. Design Tokens — Paleta de Cores

### 1.1. Tema Claro (Light Mode — Padrão iPadOS)
| Token CSS | Valor HEX | Uso |
| :--- | :--- | :--- |
| `--bg-app` | `#F2F2F7` | Fundo geral da Biblioteca e área externa do Canvas (iOS System Grouped Background) |
| `--bg-surface` | `#FFFFFF` | Cards, Modais, Popovers, Papel Branco |
| `--bg-elevated` | `rgba(255, 255, 255, 0.88)` | Top Bar e Toolbars com `backdrop-filter: blur(20px)` |
| `--bg-toolbar-dock` | `#EAECEF` | Faixa secundária de ferramentas / barra contextual |
| `--bg-canvas-workspace` | `#E5E5EA` | Mesa de fundo atrás da folha de papel no Editor |
| `--text-primary` | `#1C1C1E` | Títulos, nomes de cadernos, ícones ativos |
| `--text-secondary` | `#636366` | Datas, metadados, subtítulos, ícones inativos |
| `--text-muted` | `#8E8E93` | Placeholders, contadores de páginas |
| `--accent-primary` | `#007AFF` | Azul primário de ação, seleção, botões ativos, borda de foco |
| `--accent-teal` | `#00B4D8` | Destaque secundário / identidade da marca |
| `--accent-star` | `#FF9500` | Estrela de favoritos / marcadores de página |
| `--accent-danger` | `#FF3B30` | Excluir, lixeira, laser pointer |
| `--border-subtle` | `rgba(60, 60, 67, 0.12)` | Divisores de barras, bordas de popovers e cards |

### 1.2. Tema Escuro (Dark Mode — iPadOS Dark)
| Token CSS | Valor HEX | Uso |
| :--- | :--- | :--- |
| `--bg-app` | `#000000` | Fundo geral no modo escuro |
| `--bg-surface` | `#1C1C1E` | Cards, Modais, Popovers |
| `--bg-elevated` | `rgba(28, 28, 30, 0.88)` | Top Bar e Toolbars translúcidas |
| `--bg-toolbar-dock` | `#2C2C2E` | Faixa secundária de ferramentas |
| `--bg-canvas-workspace` | `#121214` | Mesa de fundo atrás da folha de papel |
| `--text-primary` | `#F2F2F7` | Texto principal |
| `--text-secondary` | `#AEAEB2` | Subtítulos e ícones inativos |
| `--text-muted` | `#636366` | Metadados secundários |
| `--accent-primary` | `#0A84FF` | Azul primário iOS Dark |
| `--border-subtle` | `rgba(255, 255, 255, 0.14)` | Divisores e bordas sutis |

### 1.3. Paleta de Papel e Tintas Padrão (GoodNotes Presets)
- **Papéis**:
  - *Cream / Yellow Paper*: Fundo `#FBF7EC`, Linhas `#DCD3C2`, Margem `#E5989B`
  - *White Paper*: Fundo `#FFFFFF`, Linhas `#D8E2EB`, Margem `#F4A2A2`
  - *Dark Paper*: Fundo `#1E1E24`, Linhas `#34343E`, Margem `#5E5E6E`
- **Presets de Tinta de Caneta (12 cores calibradas)**:
  - Preto (`#111827`), Azul Royal (`#1D4ED8`), Azul Celeste (`#0284C7`), Vermelho Carmim (`#DC2626`), Verde Floresta (`#15803D`), Roxo (`#7E22CE`), Laranja (`#EA580C`), Marrom (`#78350F`), Cinza Grafite (`#4B5563`), Rosa (`#DB2777`), Turquesa (`#0D9488`), Branco (`#FFFFFF` — para papel escuro).
- **Presets de Marca-Texto (6 cores translúcidas)**:
  - Amarelo Solar (`#FACC15`), Rosa Pastel (`#F472B6`), Verde Menta (`#4ADE80`), Azul Gelo (`#38BDF8`), Laranja Pêssego (`#FB923C`), Lavanda (`#C084FC`).

---

## 2. Tipografia, Raios, Sombras e Espaçamentos

### 2.1. Tipografia
- **UI System Font**: `-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Inter", system-ui, sans-serif`
- **Fontes para Caixas de Texto no Canvas**:
  1. *Sans-Serif*: `Inter / SF Pro`
  2. *Serif Editorial*: `Georgia / Merriweather`
  3. *Monospace*: `JetBrains Mono / Fira Code`
  4. *Handwritten / Estudo*: `Caveat / Patrick Hand`
- **Escala Tipográfica da UI**:
  - `Title Large (Biblioteca)`: `28px`, `font-weight: 700`, `letter-spacing: -0.02em`
  - `Header / Modal Title`: `17px`, `font-weight: 600`
  - `Body / Notebook Title`: `14px`, `font-weight: 500`
  - `Caption / Metadata`: `12px`, `font-weight: 400`

### 2.2. Raios de Borda (Border Radius) e Sombras
- **Botões da Toolbar / Pílulas**: `9999px` (pill) ou `10px` (botão quadrado iPadOS)
- **Popovers Flutuantes (Estilo iPadOS)**: `16px`, `box-shadow: 0 12px 36px rgba(0, 0, 0, 0.16), 0 2px 8px rgba(0, 0, 0, 0.08)`
- **Capas de Caderno na Biblioteca**: Canto esquerdo (lombada) `4px`, cantos direitos `12px`, sombra realista de livro `0 6px 18px rgba(0, 0, 0, 0.12), inset 4px 0 6px rgba(255, 255, 255, 0.15)`
- **Folha de Papel no Canvas**: `4px`, `box-shadow: 0 4px 20px rgba(0, 0, 0, 0.10)`
- **Alvos de Toque (Touch Targets)**: Mínimo absoluto de `44x44px` em todos os botões de barra de ferramentas para ergonomia em tablets.

---

## 3. Layout Detalhado de Cada Tela

### 3.1. Tela 1: Biblioteca (Documents View)
```
+-----------------------------------------------------------------------------------+
| [Sidebar / Tabs] |  Documentos > Semestre 2026           [Busca] [Grid/List] [Selecionar] |
|                  |----------------------------------------------------------------|
|  * Documentos    |  Ordenar por: Data de Modificação v                            |
|  * Busca         |                                                                |
|  * Favoritos     |   +-----------+   +-----------+   +-----------+   +-----------+ |
|  * Lixeira       |   |     +     |   | [Folder]  |   | [Cover 1] |   | [Cover 2] | |
|                  |   |   Novo... |   |  Cálculo  |   |  Física I |   |  PDF Aula | |
|  --------------  |   +-----------+   +-----------+   +-----------+   +-----------+ |
|  Filtros Rápidos |                    3 itens         12 págs ★       45 págs      |
|  - Cadernos      |                    Hoje, 14:20     Ontem           12 Out       |
|  - PDFs          |                                                                |
+-----------------------------------------------------------------------------------+
```
- **Card "Novo..." (`+`)**: Borda tracejada azul/cinza; toque simples abre o menu contextual (*Novo Caderno, Nova Pasta, Importar PDF/Imagem, Nota Rápida*).
- **Cards de Pasta**: Ícone vetorial de pasta iPadOS em azul celeste com badge de quantidade de itens internos.
- **Cards de Caderno**: Miniatura em proporção `3:4` mostrando a capa escolhida (com textura de lombada e etiqueta de título) ou o preview da 1ª página, estrela de favorito no canto, título editável e data abaixo.

### 3.2. Tela 2: Modal "Novo Caderno" (New Notebook Sheet)
- Modal centralizado (`max-width: 680px`, `border-radius: 20px`) dividido em:
  - **Cabeçalho**: `Cancelar` | Input de `Título do Caderno` | Botão primário `Criar`
  - **Abas Superiores**: `Capa (Cover)` e `Papel (Paper)`
  - **Controles de Página**: Seletor de Tamanho (`GoodNotes Standard`, `A4`, `A5`, `Carta`), Cor do Papel (`Creme`, `Branco`, `Escuro`) e Orientação (`Retrato`, `Paisagem`).
  - **Carrossel / Grade de Capas e Templates**: Preview visual imediato de cada capa e cada tipo de papel (Em branco, Pautado, Cornell, Quadriculado, Pontilhado, Duas Colunas, Planejador).

### 3.3. Tela 3: Editor de Documento (Document Workspace)
```
+-----------------------------------------------------------------------------------+
| [< Biblioteca] [Grid Págs] [Busca] | [Aba: Física I x] [Aba: Cálculo x] | [★] [Export] [+Pág] [...] |
+-----------------------------------------------------------------------------------+
| [Undo] [Redo] | [ZoomWin] [Caneta] [MarcaTexto] [Borracha] [Formas] [Laço] [Texto] [Img] [Laser] | (●)(●)(●) | (━)(━)(━) |
+-----------------------------------------------------------------------------------+
|                                                                                   |
|                     +---------------------------------------+                     |
|                     |                                       |                     |
|                     |          FOLHA DE PAPEL / PDF         |                     |
|                     |         (Canvas Multi-Camadas)        |                     |
|                     |                                       |                     |
|                     |                                       |                     |
|                     +---------------------------------------+                     |
|                                  Página 2 de 12                     [Zoom: 100%]  |
+-----------------------------------------------------------------------------------+
```
- **Barra de Abas de Documentos (Document Tabs)**: Assim como no GoodNotes, abrir vários cadernos mantém abas no topo para alternar instantaneamente entre um livro em PDF e o caderno de resumo.
- **Writing Toolbar Customizada**:
  - Os ícones de **Caneta**, **Marca-Texto** e **Borracha** são desenhados em SVG como pontas de instrumentos reais que mudam de cor em tempo real para refletir a cor selecionada.
  - Toque em uma ferramenta inativa → seleciona a ferramenta.
  - Toque na ferramenta **já ativa** → abre o **Popover Contextual** (ex.: tipo de ponta da caneta, sensibilidade à pressão, opções da borracha ou filtros do laço).
  - Ao lado direito da barra de ferramentas: **3 Slots de Cores** (toque duplo abre a paleta completa + conta-gotas/seletor de cor) e **3 Slots de Espessura** (com preview da espessura em ponto/linha).

### 3.4. Tela 4: Grade de Miniaturas, Favoritos e Sumário (Page Manager Modal)
- Exibe todas as páginas numeradas com miniatura renderizada.
- Cada miniatura possui:
  - Ícone de **Favorito (Bookmark Ribbon)** no canto superior direito.
  - Menu `v` com: *Adicionar Página Antes*, *Adicionar Página Depois*, *Duplicar Página*, *Rotacionar 90°*, *Mudar Template da Página*, *Exportar Página*, *Mover para Lixeira*.
  - Botão `+ Adicionar Página` como último card da grade.
