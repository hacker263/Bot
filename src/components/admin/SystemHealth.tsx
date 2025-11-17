import React, { useState, useEffect } from 'react';
import { Activity, Server, Database, Wifi, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { webhookService } from '../../services/webhookService';

interface HealthMetric {
  name: string;
  status: 'healthy' | 'warning' | 'error';
  value: string;
  description: string;
  lastChecked: Date;
}

export default function SystemHealth() {
  const [metrics, setMetrics] = useState<HealthMetric[]>([
    {
      name: 'API Response Time',
      status: 'healthy',
      value: '120ms',
      description: 'Average response time for API requests',
      lastChecked: new Date()
    },
    {
      name: 'Database Performance',
      status: 'healthy',
      value: '99.9%',
      description: 'Database uptime and query performance',
      lastChecked: new Date()
    },
    {
      name: 'WhatsApp Integration',
      status: 'warning',
      value: '98.2%',
      description: 'WhatsApp API connectivity and message delivery',
      lastChecked: new Date()
    },
    {
      name: 'Payment Gateways',
      status: 'healthy',
      value: '100%',
      description: 'Payment processor availability',
      lastChecked: new Date()
    },
    {
      name: 'Active Sessions',
      status: 'healthy',
      value: '1,247',
      description: 'Current active user sessions',
      lastChecked: new Date()
    },
    {
      name: 'Error Rate',
      status: 'healthy',
      value: '0.02%',
      description: 'Application error rate (last 24h)',
      lastChecked: new Date()
    }
  ]);

  const [systemLoad, setSystemLoad] = useState({
    cpu: 45,
    memory: 62,
    disk: 38,
    network: 23
  });
  
  const [botHealth, setBotHealth] = useState<{
    status: string;
    bot: string;
    timestamp: string;
  } | null>(null);

  useEffect(() => {
    // Simulate real-time updates
    const interval = setInterval(() => {
      setSystemLoad(prev => ({
        cpu: Math.max(10, Math.min(90, prev.cpu + (Math.random() - 0.5) * 10)),
        memory: Math.max(20, Math.min(85, prev.memory + (Math.random() - 0.5) * 8)),
        disk: Math.max(15, Math.min(75, prev.disk + (Math.random() - 0.5) * 5)),
        network: Math.max(5, Math.min(60, prev.network + (Math.random() - 0.5) * 15))
      }));
    }, 5000);

    return () => clearInterval(interval);
  }, []);
  
  useEffect(() => {
    // Check WhatsApp bot health
    const checkBotHealth = async () => {
      const health = await webhookService.checkBotHealth();
      setBotHealth(health);
    };
    
    checkBotHealth();
    const botHealthInterval = setInterval(checkBotHealth, 30000); // Check every 30 seconds
    
    return () => clearInterval(botHealthInterval);
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'error':
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'border-green-200 bg-green-50';
      case 'warning':
        return 'border-yellow-200 bg-yellow-50';
      case 'error':
        return 'border-red-200 bg-red-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  const getLoadColor = (value: number) => {
    if (value >= 80) return 'bg-red-500';
    if (value >= 60) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const overallHealth = metrics.filter(m => m.status === 'healthy').length / metrics.length * 100;

  return (
    <div className="space-y-6">
      {/* Overall Health Score */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">System Health Overview</h3>
          <div className="flex items-center space-x-2">
            <Activity className="h-5 w-5 text-blue-500" />
            <span className="text-sm text-gray-500">Live monitoring</span>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600">
              {overallHealth.toFixed(0)}%
            </div>
            <div className="text-sm text-gray-500">Overall Health</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">
              {metrics.filter(m => m.status === 'healthy').length}
            </div>
            <div className="text-sm text-gray-500">Healthy Services</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-yellow-600">
              {metrics.filter(m => m.status === 'warning').length}
            </div>
            <div className="text-sm text-gray-500">Warnings</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-red-600">
              {metrics.filter(m => m.status === 'error').length}
            </div>
            <div className="text-sm text-gray-500">Critical Issues</div>
          </div>
        </div>
      </div>

      {/* WhatsApp Bot Status */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">WhatsApp Bot Status</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className={`p-4 rounded-lg border-2 ${
            botHealth?.status === 'healthy' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                {botHealth?.status === 'healthy' ? 
                  <CheckCircle className="h-5 w-5 text-green-500" /> :
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                }
                <h4 className="font-medium text-gray-900">Bot Service</h4>
              </div>
              <span className="text-lg font-semibold text-gray-900">
                {botHealth?.status || 'Unknown'}
              </span>
            </div>
            <p className="text-sm text-gray-600">WhatsApp bot service status</p>
          </div>
          
          <div className={`p-4 rounded-lg border-2 ${
            botHealth?.bot === 'connected' ? 'border-green-200 bg-green-50' : 'border-yellow-200 bg-yellow-50'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                {botHealth?.bot === 'connected' ? 
                  <CheckCircle className="h-5 w-5 text-green-500" /> :
                  <Clock className="h-5 w-5 text-yellow-500" />
                }
                <h4 className="font-medium text-gray-900">WhatsApp Connection</h4>
              </div>
              <span className="text-lg font-semibold text-gray-900">
                {botHealth?.bot || 'Unknown'}
              </span>
            </div>
            <p className="text-sm text-gray-600">WhatsApp Web connection status</p>
          </div>
          
          <div className="p-4 rounded-lg border-2 border-blue-200 bg-blue-50">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <Activity className="h-5 w-5 text-blue-500" />
                <h4 className="font-medium text-gray-900">Last Check</h4>
              </div>
              <span className="text-sm font-semibold text-gray-900">
                {botHealth?.timestamp ? 
                  new Date(botHealth.timestamp).toLocaleTimeString() : 
                  'Never'
                }
              </span>
            </div>
            <p className="text-sm text-gray-600">Last health check timestamp</p>
          </div>
        </div>
        
        {!botHealth && (
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
            <div className="flex">
              <AlertTriangle className="h-5 w-5 text-yellow-400" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">
                  WhatsApp Bot Offline
                </h3>
                <p className="mt-1 text-sm text-yellow-700">
                  The WhatsApp bot is not responding. Please check if the bot service is running.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
      {/* System Load */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">System Resources</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.entries(systemLoad).map(([resource, value]) => (
            <div key={resource} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 capitalize">
                  {resource === 'cpu' ? 'CPU' : resource}
                </span>
                <span className="text-sm text-gray-500">{value.toFixed(0)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-500 ${getLoadColor(value)}`}
                  style={{ width: `${value}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Service Status */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Service Status</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {metrics.map((metric, index) => (
            <div
              key={index}
              className={`p-4 rounded-lg border-2 ${getStatusColor(metric.status)}`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  {getStatusIcon(metric.status)}
                  <h4 className="font-medium text-gray-900">{metric.name}</h4>
                </div>
                <span className="text-lg font-semibold text-gray-900">
                  {metric.value}
                </span>
              </div>
              <p className="text-sm text-gray-600 mb-2">{metric.description}</p>
              <p className="text-xs text-gray-500">
                Last checked: {metric.lastChecked.toLocaleTimeString()}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Events */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Recent System Events</h3>
        <div className="space-y-3">
          {[
            {
              time: '2 minutes ago',
              type: 'info',
              message: 'Database backup completed successfully'
            },
            {
              time: '15 minutes ago',
              type: 'warning',
              message: 'WhatsApp API rate limit approaching (85% of quota used)'
            },
            {
              time: '1 hour ago',
              type: 'success',
              message: 'System update deployed successfully'
            },
            {
              time: '3 hours ago',
              type: 'info',
              message: 'New merchant registration: Boerewors Express'
            }
          ].map((event, index) => (
            <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-md">
              <div className={`w-2 h-2 rounded-full mt-2 ${
                event.type === 'success' ? 'bg-green-500' :
                event.type === 'warning' ? 'bg-yellow-500' :
                event.type === 'error' ? 'bg-red-500' :
                'bg-blue-500'
              }`}></div>
              <div className="flex-1">
                <p className="text-sm text-gray-900">{event.message}</p>
                <p className="text-xs text-gray-500">{event.time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}