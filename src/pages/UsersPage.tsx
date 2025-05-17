import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Eye, 
  Edit, 
  Trash, 
  X, 
  Check,
  UserIcon,
  AlertCircle,
  Save,
  Stethoscope,
  Wrench,
  Heart
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { User } from '../types';
import { Route } from '../types';
import { supabase } from '../utils/supabase';
import { logActivity } from '../utils/activityLogger'; // Import activity logger

const UsersPage = () => {
  const { users, addUser, currentUser, currentRoute, setCurrentRoute } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [successMessage, setSuccessMessage] = useState('');
  // Add state for refresh control
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  // Form state for adding a new user
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [newRole, setNewRole] = useState('Staff');
  const [formError, setFormError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Additional staff information
  const [staffSpecialty, setStaffSpecialty] = useState('');
  const [staffLicense, setStaffLicense] = useState('');
  const [staffContact, setStaffContact] = useState('');
  const [staffNotes, setStaffNotes] = useState('');
  
  // Edit form state
  const [editFullName, setEditFullName] = useState('');
  const [editRole, setEditRole] = useState('');
  const [editSpecialty, setEditSpecialty] = useState('');
  const [editLicense, setEditLicense] = useState('');
  const [editContact, setEditContact] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  // Check if user is authenticated and is an admin
  useEffect(() => {
    // If not logged in, redirect to auth page
    if (!currentUser) {
      setCurrentRoute(Route.AUTH);
      return;
    }
    
    // Only administrators can access this page
    if (currentUser.role !== 'Administrator') {
      setCurrentRoute(Route.DASHBOARD);
    }
  }, [currentUser, setCurrentRoute]);

  // Filtered users based on search
  const filteredUsers = users.filter(user => 
    user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (user.fullName && user.fullName.toLowerCase().includes(searchQuery.toLowerCase())) ||
    user.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handle user view
  const handleViewUser = (user: User) => {
    setSelectedUser(user);
    setShowViewModal(true);
  };

  // Handle user edit
  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setEditFullName(user.fullName || '');
    setEditRole(user.role || 'Staff');
    setEditSpecialty(user.metadata?.specialty || '');
    setEditLicense(user.metadata?.license || '');
    setEditContact(user.metadata?.contact || '');
    setEditNotes(user.metadata?.notes || '');
    setFormError('');
    setShowEditModal(true);
  };

  // Handle user update
  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSuccessMessage('');
    setIsEditing(true);
    
    if (!selectedUser) {
      setFormError('No user selected for update');
      setIsEditing(false);
      return;
    }
    
    try {
      const { data, error } = await supabase.rpc('update_user', {
        p_user_id: selectedUser.id,
        p_full_name: editFullName,
        p_role: editRole,
        p_specialty: editSpecialty || null,
        p_license: editLicense || null,
        p_contact: editContact || null,
        p_notes: editNotes || null
      });
      
      if (error) {
        console.error('Error updating user:', error);
        setFormError(error.message || 'Error updating user');
        return;
      }
      
      // Log the activity
      await logActivity(
        'updated user',
        currentUser,
        `Updated user ${editFullName || selectedUser.username}`,
        'user'
      );
      
      // Show success message
      setSuccessMessage('User updated successfully!');
      
      // Trigger refresh
      setRefreshTrigger(prev => prev + 1);
      
      // Close modal after delay
      setTimeout(() => {
        setShowEditModal(false);
        setSuccessMessage('');
      }, 2000);
    } catch (err) {
      console.error('Unexpected error updating user:', err);
      setFormError('An unexpected error occurred');
    } finally {
      setIsEditing(false);
    }
  };

  // Handle user delete
  const handleDeleteUser = async (userId: string, username: string) => {
    if (!confirm(`Are you sure you want to delete user ${username}?`)) {
      return;
    }
    
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase.rpc('delete_user', {
        p_user_id: userId
      });
      
      if (error) {
        console.error('Error deleting user:', error);
        setSuccessMessage(`Error: ${error.message}`);
        return;
      }
      
      // Log the activity
      await logActivity(
        'deleted user',
        currentUser,
        `Deleted user ${username}`,
        'user'
      );
      
      // Show success message
      setSuccessMessage(`User ${username} deleted successfully!`);
      
      // Trigger refresh
      setRefreshTrigger(prev => prev + 1);
    } catch (err) {
      console.error('Unexpected error deleting user:', err);
      setSuccessMessage('An unexpected error occurred while deleting user');
    } finally {
      setIsLoading(false);
    }
  };

  // Reset the form
  const resetForm = () => {
    setNewUsername('');
    setNewPassword('');
    setNewFullName('');
    setNewRole('Staff');
    setStaffSpecialty('');
    setStaffLicense('');
    setStaffContact('');
    setStaffNotes('');
    setFormError('');
  };
  
  // Get role-specific fields
  const showRoleSpecificFields = () => {
    switch(newRole) {
      case 'Veterinarian':
        return (
          <>
            <div className="mb-4">
              <label htmlFor="staffLicense" className="block text-sm font-medium text-gray-700">
                License Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="staffLicense"
                value={staffLicense}
                onChange={(e) => setStaffLicense(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 border p-2"
                disabled={isLoading || !!successMessage}
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Required for all veterinary staff
              </p>
            </div>
            <div className="mb-4">
              <label htmlFor="staffSpecialty" className="block text-sm font-medium text-gray-700">
                Specialty Areas
              </label>
              <input
                type="text"
                id="staffSpecialty"
                value={staffSpecialty}
                onChange={(e) => setStaffSpecialty(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 border p-2"
                disabled={isLoading || !!successMessage}
                placeholder="e.g., Small Animals, Exotic Pets"
              />
            </div>
          </>
        );
      case 'Technician':
        return (
          <>
            <div className="mb-4">
              <label htmlFor="staffSpecialty" className="block text-sm font-medium text-gray-700">
                Technical Skills <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="staffSpecialty"
                value={staffSpecialty}
                onChange={(e) => setStaffSpecialty(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 border p-2"
                disabled={isLoading || !!successMessage}
                placeholder="e.g., Equipment Maintenance, Sensor Calibration"
                required
              />
            </div>
            <div className="mb-4">
              <label htmlFor="staffCertifications" className="block text-sm font-medium text-gray-700">
                Certifications
              </label>
              <input
                type="text"
                id="staffLicense"
                value={staffLicense}
                onChange={(e) => setStaffLicense(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 border p-2"
                disabled={isLoading || !!successMessage}
                placeholder="e.g., HVAC Certified, Electronics"
              />
            </div>
          </>
        );
      case 'Caretaker':
        return (
          <>
            <div className="mb-4">
              <label htmlFor="staffSpecialty" className="block text-sm font-medium text-gray-700">
                Animal Types <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="staffSpecialty"
                value={staffSpecialty}
                onChange={(e) => setStaffSpecialty(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 border p-2"
                disabled={isLoading || !!successMessage}
                placeholder="e.g., Dogs, Cats, Birds"
                required
              />
            </div>
            <div className="mb-4">
              <label htmlFor="staffExperience" className="block text-sm font-medium text-gray-700">
                Experience Level
              </label>
              <select
                id="staffLicense"
                value={staffLicense}
                onChange={(e) => setStaffLicense(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 border p-2"
                disabled={isLoading || !!successMessage}
              >
                <option value="">Select Experience Level</option>
                <option value="Junior">Junior (Less than 1 year)</option>
                <option value="Intermediate">Intermediate (1-3 years)</option>
                <option value="Senior">Senior (3+ years)</option>
              </select>
            </div>
          </>
        );
      default:
        return null;
    }
  };

  // Get role icon
  const getRoleIcon = (role: string) => {
    switch(role) {
      case 'Veterinarian':
        return <Stethoscope className="h-4 w-4 mr-1" />;
      case 'Technician':
        return <Wrench className="h-4 w-4 mr-1" />;
      case 'Caretaker':
        return <Heart className="h-4 w-4 mr-1" />;
      case 'Administrator':
        return <UserIcon className="h-4 w-4 mr-1" />;
      default:
        return null;
    }
  };

  // Validate form based on role
  const validateRoleSpecificFields = () => {
    switch(newRole) {
      case 'Veterinarian':
        if (!staffLicense) {
          return 'License number is required for veterinarians';
        }
        break;
      case 'Technician':
        if (!staffSpecialty) {
          return 'Technical skills are required for technicians';
        }
        break;
      case 'Caretaker':
        if (!staffSpecialty) {
          return 'Animal types are required for caretakers';
        }
        break;
      default:
        return null;
    }
    return null;
  };

  // Handle add user form submit
  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSuccessMessage('');
    setIsLoading(true);
    
    if (!newUsername || !newPassword) {
      setFormError('Email and password are required');
      setIsLoading(false);
      return;
    }
    
    // Validate email format
    if (!newUsername.includes('@')) {
      setFormError('Please enter a valid email address');
      setIsLoading(false);
      return;
    }

    // Validate role-specific fields
    const roleError = validateRoleSpecificFields();
    if (roleError) {
      setFormError(roleError);
      setIsLoading(false);
      return;
    }
    
    try {
      // Prepare staff metadata
      const staffMetadata: Record<string, string> = {};
      
      if (staffSpecialty) staffMetadata.specialty = staffSpecialty;
      if (staffLicense) staffMetadata.license = staffLicense;
      if (staffContact) staffMetadata.contact = staffContact;
      if (staffNotes) staffMetadata.notes = staffNotes;
      
      // Call addUser from AuthContext with additional metadata
      const { success, error, message } = await addUser({
        username: newUsername,
        password: newPassword,
        role: newRole,
        fullName: newFullName || undefined,
        metadata: staffMetadata
      });
      
      if (success) {
        // Log the activity using our new activity logger
        try {
          await logActivity(
            `added new ${newRole} user`, 
            currentUser, 
            `Created user ${newFullName || newUsername}`, 
            'user'
          );
        } catch (logError) {
          console.log("Activity logging error:", logError);
          // Continue anyway even if logging fails
        }
        
        // Reset form and show success message
        resetForm();
        setSuccessMessage(message || 'User created successfully!');
        
        // Trigger a refresh of the users list
        setRefreshTrigger(prev => prev + 1);
        
        // Stay on the page, but close modal after a delay
        setTimeout(() => {
          setShowAddModal(false);
          setSuccessMessage('');
        }, 2000);
      } else {
        setFormError(error || 'Failed to create user');
      }
    } catch (err) {
      setFormError('An unexpected error occurred');
      console.error('Error adding user:', err);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Add global success message component
  const GlobalSuccessMessage = () => {
    if (!successMessage) return null;
    
    return (
      <div className="fixed top-4 right-4 z-50 bg-green-100 border-l-4 border-green-500 text-green-700 p-4 rounded shadow-md animate-fade-in flex items-center">
        <Check className="h-5 w-5 mr-2" />
        <span>{successMessage}</span>
        <button 
          onClick={() => setSuccessMessage('')}
          className="ml-4 text-green-700 hover:text-green-900"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  };

  // If not an admin, show an unauthorized message
  if (currentUser && currentUser.role !== 'Administrator') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <AlertCircle className="h-16 w-16 text-red-500 mb-4" />
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Unauthorized Access</h1>
        <p className="text-gray-600 mb-4">You don't have permission to access user management.</p>
        <button 
          onClick={() => setCurrentRoute(Route.DASHBOARD)}
          className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Show global success message if present */}
      <GlobalSuccessMessage />
      
      <div className="flex flex-col lg:flex-row justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">Staff Management</h2>
          <p className="text-sm text-gray-500 mt-1">
            Add, view, or modify staff accounts
          </p>
        </div>
        <div className="mt-4 lg:mt-0 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search staff..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <Search className="h-5 w-5 text-gray-400 absolute left-3 top-2.5" />
          </div>
          <button
            onClick={() => {
              resetForm();
              setShowAddModal(true);
            }}
            className="flex items-center justify-center bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
          >
            <Plus className="h-5 w-5 mr-1" />
            Add Staff Member
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Staff ID
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name & Email
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Specialty
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                    {users.length === 0 
                      ? 'Loading staff data...' 
                      : 'No staff members found matching your search.'}
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {user.id.substring(0, 8)}...
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center">
                        {user.avatar ? (
                          <img 
                            src={user.avatar} 
                            alt={user.username} 
                            className="h-6 w-6 rounded-full mr-2" 
                          />
                        ) : (
                          <UserIcon className="h-5 w-5 text-gray-400 mr-2" />
                        )}
                        <div>
                          <div className="font-medium">{user.fullName || 'N/A'}</div>
                          <div className="text-xs text-gray-400">{user.username}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex items-center text-xs leading-5 font-semibold rounded-full 
                        ${user.role === 'Administrator' 
                          ? 'bg-purple-100 text-purple-800' 
                          : user.role === 'Veterinarian'
                            ? 'bg-blue-100 text-blue-800'
                            : user.role === 'Technician'
                              ? 'bg-green-100 text-green-800'
                              : user.role === 'Caretaker'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-gray-100 text-gray-800'
                        }`}>
                        {getRoleIcon(user.role)}
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.metadata?.specialty || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleViewUser(user)}
                          className="text-indigo-600 hover:text-indigo-900 border border-transparent hover:border-indigo-200 p-1 rounded"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => handleEditUser(user)}
                          className="text-blue-600 hover:text-blue-900 border border-transparent hover:border-blue-200 p-1 rounded"
                          title="Edit Staff Member"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteUser(user.id, user.username)}
                          className="text-red-600 hover:text-red-900 border border-transparent hover:border-red-200 p-1 rounded"
                          title="Remove Staff Member"
                        >
                          <Trash className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                      Add New Staff Member
                    </h3>
                    <div className="mt-4">
                      {formError && (
                        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                          {formError}
                        </div>
                      )}
                      
                      {successMessage && (
                        <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm flex items-center">
                          <Check className="h-4 w-4 mr-2" />
                          {successMessage}
                        </div>
                      )}
                      
                      <form onSubmit={handleAddUser}>
                        <div className="mb-4">
                          <label htmlFor="role" className="block text-sm font-medium text-gray-700">
                            Staff Role
                          </label>
                          <select
                            id="role"
                            value={newRole}
                            onChange={(e) => setNewRole(e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 border p-2"
                            disabled={isLoading || !!successMessage}
                          >
                            <option value="Administrator">Administrator</option>
                            <option value="Veterinarian">Veterinarian</option>
                            <option value="Technician">Technician</option>
                            <option value="Caretaker">Caretaker</option>
                            <option value="Staff">General Staff</option>
                          </select>
                          <p className="text-xs text-gray-500 mt-1">
                            Select the appropriate role for this staff member
                          </p>
                        </div>
                        
                        <div className="mb-4">
                          <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">
                            Full Name
                          </label>
                          <input
                            type="text"
                            id="fullName"
                            value={newFullName}
                            onChange={(e) => setNewFullName(e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 border p-2"
                            disabled={isLoading || !!successMessage}
                            required
                          />
                        </div>
                        
                        <div className="mb-4">
                          <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                            Email Address
                          </label>
                          <input
                            type="email"
                            id="username"
                            value={newUsername}
                            onChange={(e) => setNewUsername(e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 border p-2"
                            disabled={isLoading || !!successMessage}
                            required
                          />
                        </div>
                        
                        <div className="mb-4">
                          <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                            Password
                          </label>
                          <input
                            type="password"
                            id="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 border p-2"
                            disabled={isLoading || !!successMessage}
                            required
                            minLength={6}
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Password must be at least 6 characters
                          </p>
                        </div>
                        
                        {/* Role-specific fields */}
                        {showRoleSpecificFields()}
                        
                        <div className="mb-4">
                          <label htmlFor="staffContact" className="block text-sm font-medium text-gray-700">
                            Contact Number
                          </label>
                          <input
                            type="text"
                            id="staffContact"
                            value={staffContact}
                            onChange={(e) => setStaffContact(e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 border p-2"
                            disabled={isLoading || !!successMessage}
                          />
                        </div>
                        
                        <div className="mb-4">
                          <label htmlFor="staffNotes" className="block text-sm font-medium text-gray-700">
                            Additional Notes
                          </label>
                          <textarea
                            id="staffNotes"
                            value={staffNotes}
                            onChange={(e) => setStaffNotes(e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 border p-2"
                            disabled={isLoading || !!successMessage}
                            rows={3}
                          ></textarea>
                        </div>
                      </form>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={handleAddUser}
                  className={`w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary-600 text-base font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:ml-3 sm:w-auto sm:text-sm ${(isLoading || !!successMessage) ? 'opacity-70 cursor-not-allowed' : ''}`}
                  disabled={isLoading || !!successMessage}
                >
                  {isLoading ? (
                    <span className="inline-flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing...
                    </span>
                  ) : !!successMessage ? (
                    <>
                      <Check className="h-4 w-4 mr-2" /> Success!
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" /> Save Staff Member
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  disabled={isLoading}
                >
                  <X className="h-4 w-4 mr-2" /> Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View User Modal - Detail view for staff */}
      {showViewModal && selectedUser && (
        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 flex items-center">
                      {getRoleIcon(selectedUser.role)} Staff Details
                    </h3>
                    <div className="mt-4 flex flex-col items-center sm:items-start">
                      <div className="mb-4 flex justify-center">
                        {selectedUser.avatar ? (
                          <img 
                            src={selectedUser.avatar} 
                            alt={selectedUser.username}
                            className="h-20 w-20 rounded-full object-cover border-4 border-primary-100"
                          />
                        ) : (
                          <div className="h-20 w-20 rounded-full bg-primary-100 flex items-center justify-center">
                            <UserIcon className="h-10 w-10 text-primary-600" />
                          </div>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 gap-4 w-full">
                        <div>
                          <h4 className="text-sm font-medium text-gray-500">Full Name</h4>
                          <p className="text-sm text-gray-900">{selectedUser.fullName || 'Not provided'}</p>
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-gray-500">Email</h4>
                          <p className="text-sm text-gray-900">{selectedUser.username}</p>
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-gray-500">Role</h4>
                          <span className={`px-2 py-1 inline-flex items-center text-xs leading-5 font-semibold rounded-full 
                            ${selectedUser.role === 'Administrator' 
                              ? 'bg-purple-100 text-purple-800' 
                              : selectedUser.role === 'Veterinarian'
                                ? 'bg-blue-100 text-blue-800'
                                : selectedUser.role === 'Technician'
                                  ? 'bg-green-100 text-green-800'
                                  : selectedUser.role === 'Caretaker'
                                    ? 'bg-amber-100 text-amber-800'  
                                    : 'bg-gray-100 text-gray-800'
                            }`}>
                            {getRoleIcon(selectedUser.role)}
                            {selectedUser.role}
                          </span>
                        </div>
                        {selectedUser.metadata?.specialty && (
                          <div>
                            <h4 className="text-sm font-medium text-gray-500">
                              {selectedUser.role === 'Veterinarian' 
                                ? 'Specialty Areas' 
                                : selectedUser.role === 'Technician' 
                                  ? 'Technical Skills' 
                                  : selectedUser.role === 'Caretaker' 
                                    ? 'Animal Types' 
                                    : 'Specialty'}
                            </h4>
                            <p className="text-sm text-gray-900">{selectedUser.metadata.specialty}</p>
                          </div>
                        )}
                        {selectedUser.metadata?.license && (
                          <div>
                            <h4 className="text-sm font-medium text-gray-500">
                              {selectedUser.role === 'Veterinarian' 
                                ? 'License Number' 
                                : selectedUser.role === 'Technician' 
                                  ? 'Certifications' 
                                  : selectedUser.role === 'Caretaker' 
                                    ? 'Experience Level' 
                                    : 'License'}
                            </h4>
                            <p className="text-sm text-gray-900">{selectedUser.metadata.license}</p>
                          </div>
                        )}
                        {selectedUser.metadata?.contact && (
                          <div>
                            <h4 className="text-sm font-medium text-gray-500">Contact</h4>
                            <p className="text-sm text-gray-900">{selectedUser.metadata.contact}</p>
                          </div>
                        )}
                        {selectedUser.metadata?.notes && (
                          <div>
                            <h4 className="text-sm font-medium text-gray-500">Notes</h4>
                            <p className="text-sm text-gray-900">{selectedUser.metadata.notes}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={() => setShowViewModal(false)}
                  className="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Edit User Modal */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 flex items-center">
                      {getRoleIcon(selectedUser.role)} Edit Staff Member
                    </h3>
                    
                    <div className="mt-4">
                      {formError && (
                        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                          {formError}
                        </div>
                      )}
                      
                      {successMessage && (
                        <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm flex items-center">
                          <Check className="h-4 w-4 mr-2" />
                          {successMessage}
                        </div>
                      )}
                      
                      <form onSubmit={handleUpdateUser}>
                        <div className="mb-4">
                          <label htmlFor="editEmail" className="block text-sm font-medium text-gray-700">
                            Email Address
                          </label>
                          <input
                            type="email"
                            id="editEmail"
                            value={selectedUser.username}
                            disabled
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm bg-gray-50 py-2 px-3 text-gray-500"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Email address cannot be changed
                          </p>
                        </div>
                        
                        <div className="mb-4">
                          <label htmlFor="editFullName" className="block text-sm font-medium text-gray-700">
                            Full Name
                          </label>
                          <input
                            type="text"
                            id="editFullName"
                            value={editFullName}
                            onChange={(e) => setEditFullName(e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 border p-2"
                            disabled={isEditing}
                          />
                        </div>
                        
                        <div className="mb-4">
                          <label htmlFor="editRole" className="block text-sm font-medium text-gray-700">
                            Role
                          </label>
                          <select
                            id="editRole"
                            value={editRole}
                            onChange={(e) => setEditRole(e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 border p-2"
                            disabled={isEditing}
                          >
                            <option value="Administrator">Administrator</option>
                            <option value="Veterinarian">Veterinarian</option>
                            <option value="Technician">Technician</option>
                            <option value="Caretaker">Caretaker</option>
                            <option value="Staff">General Staff</option>
                          </select>
                        </div>
                        
                        <div className="mb-4">
                          <label htmlFor="editSpecialty" className="block text-sm font-medium text-gray-700">
                            Specialty/Skills
                          </label>
                          <input
                            type="text"
                            id="editSpecialty"
                            value={editSpecialty}
                            onChange={(e) => setEditSpecialty(e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 border p-2"
                            disabled={isEditing}
                          />
                        </div>
                        
                        <div className="mb-4">
                          <label htmlFor="editLicense" className="block text-sm font-medium text-gray-700">
                            License/Certifications
                          </label>
                          <input
                            type="text"
                            id="editLicense"
                            value={editLicense}
                            onChange={(e) => setEditLicense(e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 border p-2"
                            disabled={isEditing}
                          />
                        </div>
                        
                        <div className="mb-4">
                          <label htmlFor="editContact" className="block text-sm font-medium text-gray-700">
                            Contact
                          </label>
                          <input
                            type="text"
                            id="editContact"
                            value={editContact}
                            onChange={(e) => setEditContact(e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 border p-2"
                            disabled={isEditing}
                          />
                        </div>
                        
                        <div className="mb-4">
                          <label htmlFor="editNotes" className="block text-sm font-medium text-gray-700">
                            Notes
                          </label>
                          <textarea
                            id="editNotes"
                            value={editNotes}
                            onChange={(e) => setEditNotes(e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 border p-2"
                            rows={3}
                            disabled={isEditing}
                          ></textarea>
                        </div>
                      </form>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={handleUpdateUser}
                  className={`w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary-600 text-base font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:ml-3 sm:w-auto sm:text-sm ${isEditing ? 'opacity-70 cursor-not-allowed' : ''}`}
                  disabled={isEditing}
                >
                  {isEditing ? (
                    <span className="inline-flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Updating...
                    </span>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" /> Update Staff Member
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  disabled={isEditing}
                >
                  <X className="h-4 w-4 mr-2" /> Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersPage;