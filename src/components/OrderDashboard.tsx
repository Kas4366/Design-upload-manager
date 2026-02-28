import { useState, useMemo } from 'react';
import { Search, Filter, CheckCircle, Clock, Package } from 'lucide-react';
import { OrderWithTabs } from '../lib/types';

interface OrderDashboardProps {
  orders: OrderWithTabs[];
  onSelectOrder: (order: OrderWithTabs) => void;
  selectedOrderId: string | null;
}

type FilterType = 'all' | 'customized' | 'ready-made' | 'pending' | 'uploaded' | 'saved';
type SKUFilterType = 'all' | 'CH' | 'CD' | 'BL' | 'other';

export function OrderDashboard({ orders, onSelectOrder, selectedOrderId }: OrderDashboardProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [skuFilter, setSKUFilter] = useState<SKUFilterType>('all');

  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const matchesSearch =
        order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.veeqo_id.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesFilter =
        filter === 'all' ||
        (filter === 'customized' && order.is_customized) ||
        (filter === 'ready-made' && !order.is_customized) ||
        (filter === 'pending' && order.status === 'pending') ||
        (filter === 'uploaded' && order.status === 'uploaded') ||
        (filter === 'saved' && order.status === 'saved');

      const matchesSKU =
        skuFilter === 'all' ||
        (skuFilter === 'CH' && order.sku.toUpperCase().includes('CH')) ||
        (skuFilter === 'CD' && order.sku.toUpperCase().includes('CD')) ||
        (skuFilter === 'BL' && order.sku.toUpperCase().includes('BL')) ||
        (skuFilter === 'other' && !order.sku.toUpperCase().match(/CH|CD|BL/));

      return matchesSearch && matchesFilter && matchesSKU;
    });
  }, [orders, searchTerm, filter, skuFilter]);

  const stats = useMemo(() => {
    return {
      total: orders.length,
      customized: orders.filter(o => o.is_customized).length,
      readyMade: orders.filter(o => !o.is_customized).length,
      pending: orders.filter(o => o.status === 'pending').length,
      uploaded: orders.filter(o => o.status === 'uploaded').length,
      saved: orders.filter(o => o.status === 'saved').length
    };
  }, [orders]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'saved':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'uploaded':
        return <Package className="w-5 h-5 text-blue-600" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="text-sm text-gray-600">Total Orders</div>
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
          </div>
          <div className="bg-blue-50 p-3 rounded-lg">
            <div className="text-sm text-blue-600">Customized</div>
            <div className="text-2xl font-bold text-blue-900">{stats.customized}</div>
          </div>
          <div className="bg-green-50 p-3 rounded-lg">
            <div className="text-sm text-green-600">Completed</div>
            <div className="text-2xl font-bold text-green-900">{stats.saved}</div>
          </div>
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search by order number, SKU, or Veeqo ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Status:</span>
          </div>
          {(['all', 'customized', 'ready-made', 'pending', 'uploaded', 'saved'] as FilterType[]).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                filter === f
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {f.replace('-', ' ')}
            </button>
          ))}
        </div>

        <div className="flex gap-2 flex-wrap mt-2">
          <span className="text-sm font-medium text-gray-700">SKU Type:</span>
          {(['all', 'CH', 'CD', 'BL', 'other'] as SKUFilterType[]).map(skuType => (
            <button
              key={skuType}
              onClick={() => setSKUFilter(skuType)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                skuFilter === skuType
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {skuType.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {filteredOrders.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Package className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium">No orders found</p>
            <p className="text-sm">Try adjusting your search or filters</p>
          </div>
        ) : (
          filteredOrders.map(order => (
            <button
              key={order.id}
              onClick={() => onSelectOrder(order)}
              className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                selectedOrderId === order.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {getStatusIcon(order.status)}
                    <span className="font-semibold text-gray-900">
                      Order #{order.order_number}
                    </span>
                    {order.is_customized && (
                      <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-medium rounded">
                        Customized
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-600 mb-1">
                    SKU: <span className="font-medium">{order.sku}</span>
                  </div>
                  <div className="text-sm text-gray-500 truncate">
                    {order.product_title}
                  </div>
                  <div className="flex gap-4 mt-2 text-xs text-gray-500">
                    <span>Qty: {order.quantity}</span>
                    <span>Tabs: {order.tabs.length}</span>
                    <span>Veeqo ID: {order.veeqo_id}</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    order.status === 'saved' ? 'bg-green-100 text-green-700' :
                    order.status === 'uploaded' ? 'bg-blue-100 text-blue-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {order.status}
                  </span>
                  {order.tabs.filter(t => t.pdfFile).length > 0 && (
                    <span className="text-xs text-gray-500">
                      {order.tabs.filter(t => t.pdfFile).length}/{order.tabs.length} uploaded
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
