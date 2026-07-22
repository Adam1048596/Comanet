export function getBrandPrefix(storeName: string): string {
  if (!storeName) return ''
  // Take first two letters, uppercase
  return storeName.substring(0, 2).toUpperCase()
}

export function formatOrderNumber(order: { orderNumber: string | number; _storeName?: string }): string {
  const prefix = order._storeName ? getBrandPrefix(order._storeName) : ''
  return `${prefix}${order.orderNumber}`
}