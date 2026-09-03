// Styles (must be imported before component)
import './styles.css';

// Browser-only exports (React component)
export { RagChatbot } from './component.tsx';

// Types only (safe for browser)
export type {
  Message,
  ChatOptions,
  RagChatbotProps,
} from './types.ts';
