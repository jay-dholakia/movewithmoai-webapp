'use client'

import { useEffect, useState } from 'react'
import { AdminService } from '@/lib/services/adminService'
import type { AdminCoach } from '@/lib/types/admin'
import { Users, CheckCircle, XCircle, Edit2 } from 'lucide-react'

export default function AdminCoachesPage() {
  const [coaches, setCoaches] = useState<AdminCoach[]>([])
  const [loading, setLoading] = useState(true)
  const [editingCoach, setEditingCoach] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({
    is_available: false,
    max_clients: 50,
    max_moais: 10,
  })

  useEffect(() => {
    loadCoaches()
  }, [])

  const loadCoaches = async () => {
    try {
      const coachesData = await AdminService.getAllCoaches()
      setCoaches(coachesData)
    } catch (error) {
      console.error('Error loading coaches:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleToggleAvailability = async (coachId: string, currentStatus: boolean) => {
    try {
      const success = await AdminService.updateCoachAvailability(coachId, !currentStatus)
      if (success) {
        await loadCoaches()
      } else {
        alert('Failed to update coach availability')
      }
    } catch (error) {
      console.error('Error updating availability:', error)
      alert('Error updating coach availability')
    }
  }

  const handleSaveCapacity = async (coachId: string) => {
    try {
      const success = await AdminService.updateCoachCapacity(
        coachId,
        editForm.max_clients,
        editForm.max_moais
      )
      if (success) {
        setEditingCoach(null)
        await loadCoaches()
      } else {
        alert('Failed to update coach capacity')
      }
    } catch (error) {
      console.error('Error updating capacity:', error)
      alert('Error updating coach capacity')
    }
  }

  const startEditing = (coach: AdminCoach) => {
    setEditingCoach(coach.id)
    setEditForm({
      is_available: coach.is_available,
      max_clients: coach.max_clients,
      max_moais: coach.max_moais,
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading coaches...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Coach Management</h1>
        <p className="mt-2 text-sm text-gray-600">
          Manage coaches, their availability, and capacity
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 mb-8">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-blue-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Coaches</p>
                <p className="text-2xl font-semibold text-gray-900">{coaches.length}</p>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Available</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {coaches.filter((c) => c.is_available).length}
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <XCircle className="h-8 w-8 text-gray-400" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Unavailable</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {coaches.filter((c) => !c.is_available).length}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Coaches Table */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {coaches.map((coach) => (
            <li key={coach.id}>
              <div className="px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10">
                      {coach.profile_image_url ? (
                        <img
                          className="h-10 w-10 rounded-full"
                          src={coach.profile_image_url}
                          alt={coach.name}
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                          <span className="text-gray-600 font-medium">
                            {coach.first_name?.[0] || coach.name[0]}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="ml-4">
                      <div className="flex items-center">
                        <p className="text-sm font-medium text-gray-900">{coach.name}</p>
                        {coach.is_available ? (
                          <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Available
                          </span>
                        ) : (
                          <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            Unavailable
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">{coach.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="text-sm text-gray-900">
                        {coach.current_clients} / {coach.max_clients} clients
                      </p>
                      <p className="text-sm text-gray-500">
                        {coach.current_moais} / {coach.max_moais} Moais
                      </p>
                    </div>
                    {editingCoach === coach.id ? (
                      <div className="flex items-center space-x-2">
                        <input
                          type="number"
                          value={editForm.max_clients}
                          onChange={(e) =>
                            setEditForm({ ...editForm, max_clients: parseInt(e.target.value) })
                          }
                          className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                          placeholder="Max clients"
                        />
                        <input
                          type="number"
                          value={editForm.max_moais}
                          onChange={(e) =>
                            setEditForm({ ...editForm, max_moais: parseInt(e.target.value) })
                          }
                          className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                          placeholder="Max Moais"
                        />
                        <button
                          onClick={() => handleSaveCapacity(coach.id)}
                          className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingCoach(null)}
                          className="px-3 py-1 bg-gray-300 text-gray-700 rounded text-sm hover:bg-gray-400"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleToggleAvailability(coach.id, coach.is_available)}
                          className={`px-3 py-1 rounded text-sm ${
                            coach.is_available
                              ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                              : 'bg-green-100 text-green-700 hover:bg-green-200'
                          }`}
                        >
                          {coach.is_available ? 'Set Unavailable' : 'Set Available'}
                        </button>
                        <button
                          onClick={() => startEditing(coach)}
                          className="p-1 text-gray-400 hover:text-gray-600"
                          title="Edit capacity"
                        >
                          <Edit2 className="h-5 w-5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
        {coaches.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No coaches found</p>
          </div>
        )}
      </div>
    </div>
  )
}


