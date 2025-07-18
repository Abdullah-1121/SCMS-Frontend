"use client"

import { useState, useEffect, useRef } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import { AlertTriangle, Clock, Package, Play, ShoppingCart } from "lucide-react"

type StreamLog = {
  message: string
  timestamp: string
}

interface InventoryItem {
  item_id: string
  name: string
  stock_level: number
  reorder_threshold: number
  supplier: string
  last_updated: string
}

interface PurchaseOrder {
  order_id: string
  item_id: string
  quantity: number
  supplier: string
  order_date: string
  status: string
  item_name: string
}

interface RestockPlan {
  order_id: string
  item_id: string
  supplier: string
  logistics_partner: string
  estimated_arrival: string
  delivery_method: string
}

interface SLAViolation {
  order_id: string
  supplier: string
  reason: string
  reported_on: string
}

export default function SupplyChainDashboard() {
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([])
  const [slaViolations, setSlaViolations] = useState<SLAViolation[]>([])
  const [activityLogs, setActivityLogs] = useState<StreamLog[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const scrollAreaRef = useRef<HTMLDivElement | null>(null)

  const fetchDashboardData = async () => {
    try {
      const [inventoryRes, purchaseOrdersRes, slaViolationsRes] = await Promise.all([
        fetch("http://localhost:8000/inventory"),
        fetch("http://localhost:8000/purchase-orders"),
        fetch("http://localhost:8000/sla-violations"),
      ])

      const [inventoryData, purchaseOrderData, slaData] = await Promise.all([
        inventoryRes.json(),
        purchaseOrdersRes.json(),
        slaViolationsRes.json(),
      ])

      setInventory(inventoryData || [])
      setPurchaseOrders(purchaseOrderData || [])
      setSlaViolations(slaData || [])
    } catch (error) {
      console.error("Failed to load dashboard data:", error)
    }
  }

  const runSystem = async () => {
    setIsRunning(true)
    setActivityLogs([])

    const eventSource = new EventSource("http://localhost:8000/run-full-stream")

    eventSource.onmessage = (event) => {
      setActivityLogs((prev) => [
        ...prev,
        {
          message: event.data.trim(),
          timestamp: new Date().toLocaleTimeString(),
        },
      ])
    }

    eventSource.onerror = () => {
      console.error("Stream error occurred")
      eventSource.close()
      setIsRunning(false)
      fetchDashboardData()
    }

    eventSource.onopen = () => {
      console.log("Streaming started")
    }

    eventSource.addEventListener("end", () => {
      eventSource.close()
      setIsRunning(false)
      fetchDashboardData()
    })
  }

  useEffect(() => {
    fetchDashboardData()
  }, [])

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight
    }
  }, [activityLogs])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Pending</Badge>
      case "fulfilled":
        return <Badge className="bg-green-100 text-green-800 border-green-200">Fulfilled</Badge>
      case "cancelled":
        return <Badge className="bg-red-100 text-red-800 border-red-200">Cancelled</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  const totalPurchaseOrders = purchaseOrders.length
  const slaViolationsCount = slaViolations.length
  const lowStockItems = inventory.filter(item => item.stock_level < item.reorder_threshold)
  const averageLeadTime = "3.4 days"

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">AutoLogix - AI Powered Supply Chain Management</h1>
          <p className="text-gray-600">Real-time monitoring and optimization dashboard</p>
        </div>
        <Button onClick={runSystem} disabled={isRunning} className="bg-blue-600">
          <Play className="mr-2 h-4 w-4" />
          {isRunning ? "Running..." : "Run Supply Chain System"}
        </Button>
      </div>

      {/* Metrics Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Purchase Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPurchaseOrders}</div>
            <p className="text-xs text-muted-foreground">+2 from last week</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">SLA Violations</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{slaViolationsCount}</div>
            <p className="text-xs text-muted-foreground">-1 from last week</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Lead Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{averageLeadTime}</div>
            <p className="text-xs text-muted-foreground">-0.5 days from last week</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{lowStockItems.length}</div>
            <p className="text-xs text-muted-foreground">Requires attention</p>
          </CardContent>
        </Card>
      </div>

      {/* Logs */}
      <Card>
        <CardHeader><CardTitle>Activity Logs</CardTitle></CardHeader>
        <CardContent>
          <ScrollArea className="h-64 w-full" ref={scrollAreaRef}>
            <div className="space-y-2 p-2">
              {activityLogs.length === 0 ? (
                <p className="text-sm text-muted-foreground">No logs yet. Click "Run System" to start.</p>
              ) : (
                activityLogs.map((log, i) => (
                  <p key={i} className="text-sm text-gray-700 whitespace-pre-wrap">
                    <span className="text-muted-foreground">[{log.timestamp}]</span> {log.message}
                  </p>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Inventory Table */}
      <Card>
        <CardHeader><CardTitle>Inventory</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Threshold</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {inventory.map((item) => (
                <TableRow
                  key={item.item_id}
                  className={item.stock_level < item.reorder_threshold ? "bg-red-50" : ""}
                >
                  <TableCell className="font-medium flex items-center gap-2">
                    {item.name}
                    {item.stock_level < item.reorder_threshold && (
                      <Badge variant="destructive" className="text-xs">Low Stock</Badge>
                    )}
                  </TableCell>
                  <TableCell>{item.stock_level}</TableCell>
                  <TableCell>{item.reorder_threshold}</TableCell>
                  <TableCell>{item.supplier}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{item.last_updated}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Purchase Orders */}
      <Card>
        <CardHeader><CardTitle>Purchase Orders</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order ID</TableHead>
                <TableHead>Item</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {purchaseOrders.map((order) => (
                <TableRow key={order.order_id}>
                  <TableCell>{order.order_id}</TableCell>
                  <TableCell>{order.item_name}</TableCell>
                  <TableCell>{order.quantity}</TableCell>
                  <TableCell>{order.supplier}</TableCell>
                  <TableCell>{order.order_date}</TableCell>
                  <TableCell>{getStatusBadge(order.status)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* SLA Violations */}
      {slaViolations.length > 0 && (
        <Card>
          <CardHeader><CardTitle>SLA Violations</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Reported On</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Reason</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {slaViolations.map((v) => (
                  <TableRow key={v.order_id}>
                    <TableCell>{v.order_id}</TableCell>
                    <TableCell>{v.reported_on}</TableCell>
                    <TableCell>{v.supplier}</TableCell>
                    <TableCell>{v.reason}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
