# components

My collection of web design components. Each one lives in its own folder with its source, a demo page and a README.

## Components

| Component | Description | Stack |
| --- | --- | --- |
| [wave-background](./wave-background) | Animated light and shadow waves with grain over a solid color, like sunlight on the sea floor. | React, WebGL |

## Running a demo

Each folder is a small standalone [Vite](https://vite.dev) project. You need [Node.js](https://nodejs.org) installed.

```bash
git clone https://github.com/hadamas/components.git
cd components/wave-background
npm install
npm run dev
```

Then open the address Vite prints, usually `http://localhost:5173`.

## Using a component in your project

Copy the component file(s) from its folder into your project and import them. The folder's README lists the props and has usage examples.

## Repository structure

```
components/
├── README.md
└── wave-background/
    ├── CausticsBackground.jsx   # the component
    ├── CausticsControls.jsx     # optional settings panel
    ├── src/main.jsx             # demo page
    └── README.md
```

New components follow the same pattern: one folder, the component file(s) at its root, a demo in `src/`, and a README.
