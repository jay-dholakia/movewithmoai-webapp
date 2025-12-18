'use client'

import { useEffect, useState } from 'react'
import { AdminService } from '@/lib/services/adminService'
import type { AdminMoai } from '@/lib/types/admin'
import { Target, Users, CheckCircle, Clock, XCircle } from 'lucide-react'
import Link from 'next/link'

export default function AdminMoaisPage() {
  const [moais, setMoais] = useState<AdminMoai[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<'all' | 'forming' | 'active' | 'inactive'>('all')

  useEffect(() => {
    loadMoais()
  }, [])

  const loadMoais = async () => {
    try {
      const moaisData = await AdminService.getAllMoais()
      setMoais(moaisData)
    } catch (error) {
      console.error('Error loading Moais:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredMoais = moais.filter((moai) => {
    return filterStatus === 'all' || moai.status === filterStatus
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3 mr-1" />
            Active
          </span>
        )
      case 'forming':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <Clock className="h-3 w-3 mr-1" />
            Forming
          </span>
        )
      case 'inactive':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            <XCircle className="h-3 w-3 mr-1" />
            Inactive
          </span>
        )
      default:
        return null
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading Moais...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Moai Management</h1>
        <p className="mt-2 text-sm text-gray-600">
          View and manage all Moai groups
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-4 mb-8">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <Target className="h-8 w-8 text-orange-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Moais</p>
                <p className="text-2xl font-semibold text-gray-900">{moais.length}</p>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Active</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {moais.filter((m) => m.status === 'active').length}
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-yellow-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Forming</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {moais.filter((m) => m.status === 'forming').length}
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-blue-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">With Coach</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {moais.filter((m) => m.has_coach).length}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="bg-white shadow rounded-lg p-4 mb-6">
        <div className="flex items-center space-x-4">
          <label className="text-sm font-medium text-gray-700">Filter by Status:</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="forming">Forming</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Moais Table */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <div className="px-4 py-3 border-b border-gray-200 sm:px-6">
          <p className="text-sm text-gray-700">
            Showing <span className="font-medium">{filteredMoais.length}</span> of{' '}
            <span className="font-medium">{moais.length}</span> Moais
          </p>
        </div>
        <ul className="divide-y divide-gray-200">
          {filteredMoais.map((moai) => (
            <li key={moai.id}>
              <div className="px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center min-w-0 flex-1">
                    <div className="flex-shrink-0">
                      <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center">
                        <Target className="h-6 w-6 text-orange-600" />
                      </div>
                    </div>
                    <div className="ml-4 min-w-0 flex-1">
                      <div className="flex items-center">
                        <Link
                          href={`/admin/moais/${moai.id}`}
                          className="text-sm font-medium text-gray-900 truncate hover:text-blue-600 cursor-pointer"
                        >
                          {moai.name}
                        </Link>
                        {getStatusBadge(moai.status)}
                        {moai.has_coach && (
                          <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                            Has Coach
                          </span>
                        )}
                      </div>
                      <div className="mt-1 flex items-center text-sm text-gray-500">
                        <Users className="h-4 w-4 mr-1" />
                        <span>
                          {moai.member_count} / {moai.min_members} members
                        </span>
                        {moai.activated_at && (
                          <span className="ml-4">
                            Activated {new Date(moai.activated_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="ml-4 flex-shrink-0 text-right">
                    <div className="text-sm text-gray-500">
                      Created {new Date(moai.created_at).toLocaleDateString()}
                    </div>
                    {moai.coach_id && (
                      <div className="text-xs text-gray-400 mt-1">Coach assigned</div>
                    )}
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
        {filteredMoais.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No Moais found matching your filter</p>
          </div>
        )}
      </div>
    </div>
  )
}

