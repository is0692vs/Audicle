export function cn(...inputs: (string | undefined | null | false)[]): string {
    return inputs
        .filter((x): x is string => typeof x === 'string')
        .join(' ')
        .split(/\s+/)
        .filter(Boolean)
        .join(' ')
}
