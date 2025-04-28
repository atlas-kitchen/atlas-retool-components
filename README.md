## Custom component libraries template

Use this as a base for new custom component library projects within [Retool](https://www.retool.com).

To learn more about how custom component libraries work, visit our [official documentation](https://docs.retool.com/apps/guides/custom/custom-component-libraries).

---

## Component Structure & Usage

### Raffles Logistics Importer

- The main component is now `RafflesLogisticsImporter`, located at:
  - `src/components/Raffles/RafflesLogisticsImporter.tsx`
- Supporting files for this component are organized in the same folder:
  - `importerConfig.ts` (sheet configuration)
  - `utils.ts` (utility functions)

### Export

- The library exports the component from `src/index.tsx`:
  ```ts
  export { RafflesLogisticsImporter } from './components/Raffles/RafflesLogisticsImporter'
  ```

### Adding New Custom Components

- To add a new custom component:
  1. Create a new subfolder under `src/components/` (e.g., `src/components/YourComponentName/`).
  2. Place your main component and any supporting files in that folder.
  3. Export your component in `src/index.tsx` for library consumers.

**Example:**

```ts
// src/index.tsx
export { YourComponent } from './components/YourComponentName/YourComponent'
```

This structure keeps components modular and easy to maintain.
