export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const period = searchParams.get('period') || 'today'

  // Mock 80 orders
  const mockOrders = Array.from({ length: 80 }, (_, i) => ({
    total: (Math.random() * 100 + 20).toFixed(2),
    createdAt: new Date(Date.now() - i * 3600000).toISOString(),
    status: i % 3 === 0 ? 'completed' : i % 3 === 1 ? 'processing' : 'pending',
  }));

  const totalOrders = mockOrders.length
  const totalRevenue = mockOrders.reduce((sum, o) => sum + parseFloat(o.total), 0)
  const averageOrderValue = totalRevenue / totalOrders

  const dailyMap: Record<string, number> = {}
  mockOrders.forEach(o => {
    const day = o.createdAt.split('T')[0]
    dailyMap[day] = (dailyMap[day] || 0) + 1
  })
  const chartData = Object.entries(dailyMap).map(([date, orders]) => ({ date, orders }))

  return Response.json({
    totalOrders,
    totalRevenue,
    averageOrderValue,
    ordersGrowth: 12.5,
    chartData,
  })
}