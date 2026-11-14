// `npm start`: serve the demo app on http://localhost:4173/
import { serve } from '../src/serve.mjs';
const port = Number(process.env.PORT || 4173);
const { url } = await serve('app', port, process.env.HOST || '127.0.0.1');
console.log(`Splitty is running at ${url}  (Ctrl+C to stop)`);
