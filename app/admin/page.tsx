'use client'

import { useEffect, useState } from 'react'
import { AdminService } from '@/lib/services/adminService'
import type { AdminStats } from '@/lib/types/admin'
import { Users, UserCheck, UsersRound, Activity, TrendingUp, Target, Calendar } from 'lucide-react'
import Link from 'next/link'

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      const statsData = await AdminService.getAdminStats()
      setStats(statsData)
    } catch (error) {
      console.error('Error loading stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Failed to load dashboard stats</p>
      </div>
    )
  }

  const statCards = [
    {
      title: 'Total Users',
      value: stats.totalUsers,
      icon: Users,
      color: 'bg-blue-500',
      change: `${stats.newUsersThisMonth} new this month`,
      href: '/admin/analytics/users',
    },
    {
      title: 'Active Users',
      value: stats.activeUsers,
      icon: UserCheck,
      color: 'bg-green-500',
      subtitle: 'Last 30 days',
      href: '/admin/analytics/users',
    },
    {
      title: 'Total Coaches',
      value: stats.totalCoaches,
      icon: UsersRound,
      color: 'bg-purple-500',
      change: `${stats.activeCoaches} available`,
      href: '/admin/coaches',
    },
    {
      title: 'Active Moais',
      value: stats.activeMoais,
      icon: Target,
      color: 'bg-orange-500',
      change: `${stats.totalMoais} total`,
      href: '/admin/moais',
    },
    {
      title: 'Active Subscriptions',
      value: stats.activeSubscriptions,
      icon: Activity,
      color: 'bg-indigo-500',
      change: `${stats.totalSubscriptions} total`,
      href: '/admin/analytics/subscriptions',
    },
    {
      title: 'Commitment %',
      value: `${stats.averageCompletionRate.toFixed(1)}%`,
      icon: TrendingUp,
      color: 'bg-teal-500',
      change: `${stats.totalCompleted} / ${stats.totalCommitted} completed`,
      href: '/admin/analytics/commitment',
    },
  ]

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="mt-2 text-sm text-gray-600">
          Overview of platform metrics and activity
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {statCards.map((stat) => {
          const Icon = stat.icon
          const CardContent = (
            <div className="p-5">
              <div className="flex items-center">
                <div className={`${stat.color} rounded-md p-3`}>
                  <Icon className="h-6 w-6 text-white" aria-hidden="true" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      {stat.title}
                    </dt>
                    <dd className="flex items-baseline">
                      <div className="text-2xl font-semibold text-gray-900">
                        {stat.value}
                      </div>
                    </dd>
                  </dl>
                </div>
              </div>
              {stat.change && (
                <div className="mt-4">
                  <div className="text-sm text-gray-600">{stat.change}</div>
                </div>
              )}
              {stat.subtitle && (
                <div className="mt-1">
                  <div className="text-xs text-gray-500">{stat.subtitle}</div>
                </div>
              )}
            </div>
          )

          if (stat.href) {
            return (
              <Link
                key={stat.title}
                href={stat.href}
                className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow cursor-pointer block"
              >
                {CardContent}
              </Link>
            )
          }

          return (
            <div
              key={stat.title}
              className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow"
            >
              {CardContent}
            </div>
          )
        })}
      </div>

      {/* Quick Actions */}
      <div className="mt-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <a
            href="/admin/users"
            className="block bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow"
          >
            <div className="flex items-center">
              <Users className="h-8 w-8 text-blue-500" />
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900">Manage Users</h3>
                <p className="text-sm text-gray-500">View and manage all users</p>
              </div>
            </div>
          </a>

          <a
            href="/admin/coaches"
            className="block bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow"
          >
            <div className="flex items-center">
              <UsersRound className="h-8 w-8 text-purple-500" />
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900">Manage Coaches</h3>
                <p className="text-sm text-gray-500">View and manage coaches</p>
              </div>
            </div>
          </a>

          <a
            href="/admin/moais"
            className="block bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow"
          >
            <div className="flex items-center">
              <Target className="h-8 w-8 text-orange-500" />
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900">Manage Moais</h3>
                <p className="text-sm text-gray-500">View and manage Moai groups</p>
              </div>
            </div>
          </a>
        </div>
      </div>
    </div>
  )
}

