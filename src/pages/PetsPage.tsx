import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Eye, 
  Edit, 
  Trash, 
  X, 
  Check, 
  Dog,
  Cat,
  Filter,
  Save,
  AlertCircle
} from 'lucide-react';
import { Pet, PetType, Gender } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../utils/supabase';

// Interface for breed data
interface BreedData {
  name: string;
  normal_temp_min: number;
  normal_temp_max: number;
  critical_temp: number;
  is_custom: boolean;
}

const PetsPage = () => {
  const { currentUser } = useAuth();
  // Pet data state
  const [pets, setPets] = useState<Pet[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('All');
  const [isLoading, setIsLoading] = useState(true);
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
  
  // Form state for adding/editing a pet
  const [petName, setPetName] = useState('');
  const [petType, setPetType] = useState<PetType>('Dog');
  const [petBreed, setPetBreed] = useState('');
  const [petGender, setPetGender] = useState<Gender>('Male');
  const [petIsPregnant, setPetIsPregnant] = useState(false);
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  
  // Breeds state
  const [dogBreeds, setDogBreeds] = useState<BreedData[]>([]);
  const [catBreeds, setCatBreeds] = useState<BreedData[]>([]);
  const [customBreed, setCustomBreed] = useState('');
  const [useCustomBreed, setUseCustomBreed] = useState(false);

  // Load pets from Supabase on initial render
  useEffect(() => {
    fetchPets();
    fetchBreeds('Dog');
    fetchBreeds('Cat');
  }, []);

  // Fetch pets from database
  const fetchPets = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('pets')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) {
        console.error('Error fetching pets:', error);
        return;
      }
      
      // Map the database field is_pregnant to isPregnant in our Pet objects
      const formattedPets = data?.map(pet => ({
        id: pet.id,
        name: pet.name,
        type: pet.type,
        breed: pet.breed,
        gender: pet.gender,
        isPregnant: pet.is_pregnant === true, // Ensure it's a boolean
        owner: pet.owner_id,
        image: pet.image_url,
        created_at: pet.created_at,
        updated_at: pet.updated_at
      })) || [];
      
      setPets(formattedPets);
    } catch (err) {
      console.error('Unexpected error fetching pets:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch breeds for a specific pet type
  const fetchBreeds = async (type: 'Dog' | 'Cat') => {
    try {
      const { data, error } = await supabase
        .rpc('get_pet_breeds', { p_type: type });
        
      if (error) {
        console.error(`Error fetching ${type.toLowerCase()} breeds:`, error);
        return;
      }
      
      if (type === 'Dog') {
        setDogBreeds(data || []);
      } else {
        setCatBreeds(data || []);
      }
    } catch (err) {
      console.error(`Unexpected error fetching ${type.toLowerCase()} breeds:`, err);
    }
  };

  // Handle pet type change to reset breed selection
  const handlePetTypeChange = (type: PetType) => {
    setPetType(type);
    setPetBreed('');
    setUseCustomBreed(false);
  };

  // Get current breeds list based on selected pet type
  const getCurrentBreeds = () => {
    return petType === 'Dog' ? dogBreeds : catBreeds;
  };

  // Filtered pets based on search and type filter
  const filteredPets = pets.filter(pet => {
    const matchesSearch = pet.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         pet.breed.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = filterType === 'All' || pet.type === filterType;
    
    return matchesSearch && matchesType;
  });

  // Handle pet view
  const handleViewPet = (pet: Pet) => {
    setSelectedPet(pet);
    setShowViewModal(true);
  };

  // Handle pet edit
  const handleEditPet = (pet: Pet) => {
    setSelectedPet(pet);
    setPetName(pet.name);
    setPetType(pet.type);
    
    // Check if breed exists in predefined breeds
    const isCustomBreed = pet.type === 'Dog' 
      ? !dogBreeds.some(b => b.name.toLowerCase() === pet.breed.toLowerCase())
      : !catBreeds.some(b => b.name.toLowerCase() === pet.breed.toLowerCase());
    
    if (isCustomBreed) {
      setUseCustomBreed(true);
      setCustomBreed(pet.breed);
      setPetBreed('');
    } else {
      setUseCustomBreed(false);
      setPetBreed(pet.breed);
      setCustomBreed('');
    }
    
    setPetGender(pet.gender);
    // Ensure isPregnant is a boolean
    setPetIsPregnant(pet.isPregnant === true);
    setShowEditModal(true);
  };

  // Handle pet delete
  const handleDeletePet = async (petId: string) => {
    try {
      const { error } = await supabase
        .rpc('delete_pet', { p_pet_id: petId });
        
      if (error) {
        console.error('Error deleting pet:', error);
        return;
      }
      
      setPets(pets.filter(pet => pet.id !== petId));
    } catch (err) {
      console.error('Unexpected error deleting pet:', err);
    }
  };

  // Reset form
  const resetForm = () => {
    setPetName('');
    setPetType('Dog');
    setPetBreed('');
    setCustomBreed('');
    setPetGender('Male');
    setPetIsPregnant(false);
    setUseCustomBreed(false);
    setFormError('');
    setSuccessMessage('');
  };

  // Validate form
  const validateForm = () => {
    if (!petName) {
      setFormError('Pet name is required');
      return false;
    }
    
    // Check breed selection
    if (!useCustomBreed && !petBreed) {
      setFormError('Please select a breed');
      return false;
    }
    
    if (useCustomBreed && !customBreed) {
      setFormError('Please enter a custom breed name');
      return false;
    }
    
    return true;
  };

  // Handle add pet form submit
  const handleAddPet = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSuccessMessage('');
    
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    
    try {
      // Determine the final breed value (selected or custom)
      const finalBreed = useCustomBreed ? customBreed : petBreed;
      
      // Default image URLs based on pet type
      const defaultImageUrl = petType === 'Dog' 
        ? 'https://images.pexels.com/photos/2253275/pexels-photo-2253275.jpeg?auto=compress&cs=tinysrgb&w=300' 
        : 'https://images.pexels.com/photos/1170986/pexels-photo-1170986.jpeg?auto=compress&cs=tinysrgb&w=300';
      
      // Make sure isPregnant is explicitly a boolean
      const isPregnantValue = petGender === 'Female' ? !!petIsPregnant : false;
      
      // Call the add_pet function to add the pet
      const { data, error } = await supabase.rpc('add_pet', {
        p_name: petName,
        p_type: petType,
        p_breed: finalBreed,
        p_gender: petGender,
        p_is_pregnant: isPregnantValue, // This matches the parameter name in the add_pet function
        p_image_url: defaultImageUrl
      });
      
      if (error) {
        console.error('Error adding pet:', error);
        setFormError(error.message || 'Error adding pet');
        return;
      }
      
      // Show success message
      setSuccessMessage('Pet added successfully!');
      
      // Refresh the pets list
      fetchPets();
      
      // If a custom breed was added, refresh the breeds lists
      if (useCustomBreed) {
        fetchBreeds(petType);
      }
      
      // Close modal after a delay
      setTimeout(() => {
        resetForm();
        setShowAddModal(false);
      }, 1500);
    } catch (err) {
      console.error('Unexpected error adding pet:', err);
      setFormError('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle edit pet form submit
  const handleUpdatePet = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSuccessMessage('');
    
    if (!selectedPet) {
      setFormError('No pet selected');
      return;
    }
    
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    
    try {
      // Determine the final breed value (selected or custom)
      const finalBreed = useCustomBreed ? customBreed : petBreed;
      
      // Make sure isPregnant is explicitly a boolean
      const isPregnantValue = petGender === 'Female' ? !!petIsPregnant : false;
      
      // Update the pet in the database
      const { error } = await supabase
        .rpc('update_pet', {
          p_pet_id: selectedPet.id,
          p_name: petName,
          p_type: petType,
          p_breed: finalBreed,
          p_gender: petGender,
          p_is_pregnant: isPregnantValue // This matches the parameter name in the update_pet function
        });
        
      if (error) {
        console.error('Error updating pet:', error);
        setFormError(error.message || 'Error updating pet');
        return;
      }
      
      // Show success message
      setSuccessMessage('Pet updated successfully!');
      
      // Refresh the pets list
      fetchPets();
      
      // If a custom breed was added, refresh the breeds lists
      if (useCustomBreed) {
        fetchBreeds(petType);
      }
      
      // Close modal after a delay
      setTimeout(() => {
        resetForm();
        setShowEditModal(false);
      }, 1500);
    } catch (err) {
      console.error('Unexpected error updating pet:', err);
      setFormError('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col lg:flex-row justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">Pet Management</h2>
          <p className="text-sm text-gray-500 mt-1">
            Manage pets in the system
          </p>
        </div>
        <div className="mt-4 lg:mt-0 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search pets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <Search className="h-5 w-5 text-gray-400 absolute left-3 top-2.5" />
          </div>
          <div className="relative">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent appearance-none"
            >
              <option value="All">All Types</option>
              <option value="Dog">Dogs</option>
              <option value="Cat">Cats</option>
            </select>
            <Filter className="h-5 w-5 text-gray-400 absolute left-3 top-2.5" />
          </div>
          <button
            onClick={() => {
              resetForm();
              setShowAddModal(true);
            }}
            className="flex items-center justify-center bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
          >
            <Plus className="h-5 w-5 mr-1" />
            Add Pet
          </button>
        </div>
      </div>

      {/* Pets Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center items-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            <span className="ml-2">Loading pets...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pet
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Breed
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Gender
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pregnant
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredPets.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-500">
                      No pets found
                    </td>
                  </tr>
                ) : (
                  filteredPets.map((pet) => (
                    <tr key={pet.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {pet.image ? (
                            <img
                              src={pet.image}
                              alt={pet.name}
                              className="h-10 w-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                              {pet.type === 'Dog' ? (
                                <Dog className="h-6 w-6 text-gray-500" />
                              ) : (
                                <Cat className="h-6 w-6 text-gray-500" />
                              )}
                            </div>
                          )}
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{pet.name}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          pet.type === 'Dog' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                        }`}>
                          {pet.type === 'Dog' ? (
                            <Dog className="h-3 w-3 mr-1" />
                          ) : (
                            <Cat className="h-3 w-3 mr-1" />
                          )}
                          {pet.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {pet.breed}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {pet.gender}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {pet.gender === 'Female' ? (
                          pet.isPregnant === true ? (
                            <span className="inline-flex items-center">
                              <span className="flex-shrink-0 h-4 w-4 rounded-full bg-green-500 mr-2" />
                              <span className="text-green-700 font-medium">Yes</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center">
                              <span className="flex-shrink-0 h-4 w-4 rounded-full bg-blue-300 mr-2" />
                              <span className="text-blue-700 font-medium">No</span>
                            </span>
                          )
                        ) : (
                          <span className="text-gray-400">N/A</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleViewPet(pet)}
                            className="text-indigo-600 hover:text-indigo-900 border border-transparent hover:border-indigo-200 p-1 rounded"
                            title="View Pet"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleEditPet(pet)}
                            className="text-blue-600 hover:text-blue-900 border border-transparent hover:border-blue-200 p-1 rounded"
                            title="Edit Pet"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeletePet(pet.id)}
                            className="text-red-600 hover:text-red-900 border border-transparent hover:border-red-200 p-1 rounded"
                            title="Delete Pet"
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
        )}
      </div>

      {/* Add Pet Modal */}
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
                      Add New Pet
                    </h3>
                    <div className="mt-4">
                      {formError && (
                        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                          <div className="flex items-center">
                            <AlertCircle className="h-4 w-4 mr-2" />
                            {formError}
                          </div>
                        </div>
                      )}
                      
                      {successMessage && (
                        <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
                          <div className="flex items-center">
                            <Check className="h-4 w-4 mr-2" />
                            {successMessage}
                          </div>
                        </div>
                      )}
                      
                      <form onSubmit={handleAddPet}>
                        <div className="mb-4">
                          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                            Pet Name <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            id="name"
                            value={petName}
                            onChange={(e) => setPetName(e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 border p-2"
                            disabled={isSubmitting}
                            required
                          />
                        </div>
                        
                        <div className="mb-4">
                          <label htmlFor="type" className="block text-sm font-medium text-gray-700">
                            Pet Type
                          </label>
                          <div className="mt-1 grid grid-cols-2 gap-3">
                            <div
                              className={`border rounded-md p-3 flex items-center justify-center cursor-pointer ${
                                petType === 'Dog' 
                                  ? 'bg-blue-50 border-blue-500 text-blue-700' 
                                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                              }`}
                              onClick={() => handlePetTypeChange('Dog')}
                            >
                              <Dog className={`h-5 w-5 ${petType === 'Dog' ? 'text-blue-500' : 'text-gray-400'} mr-2`} />
                              Dog
                            </div>
                            <div
                              className={`border rounded-md p-3 flex items-center justify-center cursor-pointer ${
                                petType === 'Cat' 
                                  ? 'bg-purple-50 border-purple-500 text-purple-700' 
                                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                              }`}
                              onClick={() => handlePetTypeChange('Cat')}
                            >
                              <Cat className={`h-5 w-5 ${petType === 'Cat' ? 'text-purple-500' : 'text-gray-400'} mr-2`} />
                              Cat
                            </div>
                          </div>
                        </div>
                        
                        <div className="mb-4">
                          <label htmlFor="breed" className="block text-sm font-medium text-gray-700">
                            Breed <span className="text-red-500">*</span>
                          </label>
                          {!useCustomBreed ? (
                            <>
                              <select
                                id="breed"
                                value={petBreed}
                                onChange={(e) => setPetBreed(e.target.value)}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 border p-2"
                                disabled={isSubmitting}
                                required={!useCustomBreed}
                              >
                                <option value="">Select breed</option>
                                {getCurrentBreeds().map((breed, index) => (
                                  <option key={index} value={breed.name}>
                                    {breed.name} {breed.is_custom && '(Custom)'}
                                  </option>
                                ))}
                              </select>
                              <div className="mt-2">
                                <button
                                  type="button"
                                  onClick={() => setUseCustomBreed(true)}
                                  className="text-primary-600 text-sm hover:text-primary-800"
                                  disabled={isSubmitting}
                                >
                                  + Add custom breed
                                </button>
                              </div>
                            </>
                          ) : (
                            <>
                              <input
                                type="text"
                                id="customBreed"
                                value={customBreed}
                                onChange={(e) => setCustomBreed(e.target.value)}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 border p-2"
                                placeholder="Enter custom breed"
                                disabled={isSubmitting}
                                required={useCustomBreed}
                              />
                              <div className="mt-2">
                                <button
                                  type="button"
                                  onClick={() => setUseCustomBreed(false)}
                                  className="text-gray-600 text-sm hover:text-gray-800"
                                  disabled={isSubmitting}
                                >
                                  Select from existing breeds
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                        
                        <div className="mb-4">
                          <label htmlFor="gender" className="block text-sm font-medium text-gray-700">
                            Gender
                          </label>
                          <div className="mt-1 grid grid-cols-2 gap-3">
                            <div
                              className={`border rounded-md p-3 flex items-center justify-center cursor-pointer ${
                                petGender === 'Male' 
                                  ? 'bg-blue-50 border-blue-500 text-blue-700' 
                                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                              }`}
                              onClick={() => setPetGender('Male')}
                            >
                              <span className="text-lg mr-1">♂</span> Male
                            </div>
                            <div
                              className={`border rounded-md p-3 flex items-center justify-center cursor-pointer ${
                                petGender === 'Female' 
                                  ? 'bg-pink-50 border-pink-500 text-pink-700' 
                                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                              }`}
                              onClick={() => setPetGender('Female')}
                            >
                              <span className="text-lg mr-1">♀</span> Female
                            </div>
                          </div>
                        </div>
                        
                        {petGender === 'Female' && (
                          <div className="mb-4">
                            <div className="flex items-center">
                              <input
                                type="checkbox"
                                id="isPregnant"
                                checked={petIsPregnant}
                                onChange={(e) => setPetIsPregnant(e.target.checked)}
                                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                                disabled={isSubmitting}
                              />
                              <label htmlFor="isPregnant" className="ml-2 block text-sm text-gray-700">
                                Pregnant
                              </label>
                            </div>
                          </div>
                        )}
                      </form>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={handleAddPet}
                  className={`w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary-600 text-base font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:ml-3 sm:w-auto sm:text-sm ${
                    isSubmitting ? 'opacity-70 cursor-not-allowed' : ''
                  }`}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" /> Add Pet
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  disabled={isSubmitting}
                >
                  <X className="h-4 w-4 mr-2" /> Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Pet Modal */}
      {showEditModal && selectedPet && (
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
                      Edit Pet
                    </h3>
                    <div className="mt-4">
                      {formError && (
                        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                          {formError}
                        </div>
                      )}
                      <form onSubmit={handleUpdatePet}>
                        <div className="mb-4">
                          <label htmlFor="petName" className="block text-sm font-medium text-gray-700">
                            Name
                          </label>
                          <input
                            type="text"
                            id="petName"
                            value={petName}
                            onChange={(e) => setPetName(e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 border p-2"
                          />
                        </div>
                        <div className="mb-4">
                          <label htmlFor="petType" className="block text-sm font-medium text-gray-700">
                            Type
                          </label>
                          <select
                            id="petType"
                            value={petType}
                            onChange={(e) => setPetType(e.target.value as PetType)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 border p-2"
                          >
                            <option value="Dog">Dog</option>
                            <option value="Cat">Cat</option>
                          </select>
                        </div>
                        <div className="mb-4">
                          <label htmlFor="petBreed" className="block text-sm font-medium text-gray-700">
                            Breed
                          </label>
                          <input
                            type="text"
                            id="petBreed"
                            value={petBreed}
                            onChange={(e) => setPetBreed(e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 border p-2"
                          />
                        </div>
                        <div className="mb-4">
                          <label htmlFor="petGender" className="block text-sm font-medium text-gray-700">
                            Gender
                          </label>
                          <select
                            id="petGender"
                            value={petGender}
                            onChange={(e) => setPetGender(e.target.value as Gender)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 border p-2"
                          >
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                          </select>
                        </div>
                        {petGender === 'Female' && (
                          <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Pregnancy Status
                            </label>
                            <div className="mt-1 grid grid-cols-2 gap-3">
                              <div
                                className={`border rounded-md p-3 flex items-center justify-center cursor-pointer ${
                                  petIsPregnant === true
                                    ? 'bg-green-50 border-green-500 text-green-700' 
                                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                                }`}
                                onClick={() => setPetIsPregnant(true)}
                              >
                                <span className="text-lg mr-1">✓</span> Pregnant
                              </div>
                              <div
                                className={`border rounded-md p-3 flex items-center justify-center cursor-pointer ${
                                  petIsPregnant === false
                                    ? 'bg-blue-50 border-blue-500 text-blue-700' 
                                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                                }`}
                                onClick={() => setPetIsPregnant(false)}
                              >
                                <span className="text-lg mr-1">✗</span> Not Pregnant
                              </div>
                            </div>
                          </div>
                        )}
                      </form>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={handleUpdatePet}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary-600 text-base font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  <Check className="h-4 w-4 mr-2" /> Update Pet
                </button>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  <X className="h-4 w-4 mr-2" /> Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Pet Modal */}
      {showViewModal && selectedPet && (
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
                      Pet Details
                    </h3>
                    <div className="mt-4 flex flex-col items-center sm:items-start">
                      <div className="mb-4 flex justify-center">
                        {selectedPet.image ? (
                          <img 
                            src={selectedPet.image} 
                            alt={selectedPet.name}
                            className="h-32 w-32 rounded-lg object-cover border-4 border-primary-100"
                          />
                        ) : (
                          selectedPet.type === 'Dog' ? (
                            <div className="h-32 w-32 rounded-lg bg-green-100 flex items-center justify-center">
                              <Dog className="h-16 w-16 text-green-600" />
                            </div>
                          ) : (
                            <div className="h-32 w-32 rounded-lg bg-purple-100 flex items-center justify-center">
                              <Cat className="h-16 w-16 text-purple-600" />
                            </div>
                          )
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 gap-4 w-full">
                        <div>
                          <h4 className="text-sm font-medium text-gray-500">Name</h4>
                          <p className="text-sm text-gray-900">{selectedPet.name}</p>
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-gray-500">Type</h4>
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            selectedPet.type === 'Dog' ? 'bg-green-100 text-green-800' : 'bg-purple-100 text-purple-800'
                          }`}>
                            {selectedPet.type}
                          </span>
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-gray-500">Breed</h4>
                          <p className="text-sm text-gray-900">{selectedPet.breed}</p>
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-gray-500">Gender</h4>
                          <p className="text-sm text-gray-900">{selectedPet.gender}</p>
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-gray-500">Pregnant</h4>
                          {selectedPet.gender === 'Female' ? (
                            selectedPet.isPregnant === true ? (
                              <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                Yes
                              </span>
                            ) : (
                              <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                                No
                              </span>
                            )
                          ) : (
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                              N/A
                            </span>
                          )}
                        </div>
                        {selectedPet.owner && (
                          <div>
                            <h4 className="text-sm font-medium text-gray-500">Owner</h4>
                            <p className="text-sm text-gray-900">{selectedPet.owner}</p>
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
    </div>
  );
};

export default PetsPage;


















