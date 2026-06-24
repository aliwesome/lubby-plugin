/**
 * Shared TUI helpers for the Lubby commands. Pure Node, no dependencies.
 *
 * Every command prints through these so the whole plugin reads as one product:
 * the same Campfire palette as the status line (orange #FF6B35, gold #FFB703),
 * the same "✶ Lubby · <title>" header, aligned key/value rows, and dim hints.
 *
 * Colour is emitted as truecolor ANSI, which the Claude Code transcript renders.
 * Honours NO_COLOR (https://no-color.org) so piped or plain terminals stay clean.
 */
const useColor = !process.env.NO_COLOR;
const paint = (code) => (useColor ? code : '');

export const ORANGE = paint('\x1b[38;2;255;107;53m');
export const GOLD = paint('\x1b[38;2;255;183;3m');
export const GREEN = paint('\x1b[38;2;52;199;89m');
export const DIM = paint('\x1b[2m');
export const BOLD = paint('\x1b[1m');
export const RESET = paint('\x1b[0m');

// Inner width of the rule and the label column, kept fixed so successive
// commands line up vertically in the transcript.
const WIDTH = 46;
const LABEL = 13;

export function header(title) {
    const suffix = title ? ` ${DIM}·${RESET} ${BOLD}${title}${RESET}` : '';
    return `\n  ${ORANGE}✶ Lubby${RESET}${suffix}`;
}

export function rule() {
    return `  ${DIM}${'─'.repeat(WIDTH)}${RESET}`;
}

export function row(label, value, note) {
    const left = `${DIM}${String(label).padEnd(LABEL)}${RESET}`;
    const right = note ? `   ${DIM}${note}${RESET}` : '';
    return `  ${left}${value}${right}`;
}

export function hint(text) {
    return `  ${DIM}${text}${RESET}`;
}

export const gold = (text) => `${GOLD}${text}${RESET}`;
export const green = (text) => `${GREEN}${text}${RESET}`;
export const dim = (text) => `${DIM}${text}${RESET}`;

export function render(lines) {
    const body = lines.filter((line) => line !== null && line !== undefined).join('\n');
    process.stdout.write(body + '\n');
}
