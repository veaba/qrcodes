/**
 * Demo script to test toTerminal methods for qrcode-wasm
 */

// Test the TypeScript types to verify the methods exist
import type { QRCodeWasm } from './packages/qrcode-wasm/pkg/qrcodes.js';

// Type check: verify that QRCodeWasm has the terminal methods
type HasToTerminal = typeof QRCodeWasm.prototype.to_terminal;
type HasToTerminalBraille = typeof QRCodeWasm.prototype.to_terminal_braille;
type HasToTerminalColor = typeof QRCodeWasm.prototype.to_terminal_color;

// This file is just for type checking - if it compiles, the methods exist
console.log('TypeScript type check passed - toTerminal methods exist on QRCodeWasm');
