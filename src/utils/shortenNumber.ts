export default function shortenNumber(number: number): string {
  return number.toFixed(3).replace(/\.?0+$/gm, '')
}
