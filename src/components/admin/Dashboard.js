import Sidebar from '../common/Sidebar';
import MapSection from './MapSection';
import StatsSection from './StatsSection';
import { useState, useEffect } from 'react';
import { getWithExpiry } from '../../utils/localstorage'; // Assurez-vous que localstorage.js est dans src/utils/
import { useNavigate } from 'react-router-dom'; // Importation corrigée pour useNavigate

export default function AdminDashboard({ _userId }) {
  const [activeSection, setActiveSection] = useState('dashboard');
  const [users, setUsers] = useState([]);
  const [buses, setBuses] = useState([]);
  const [showForm, setShowForm] = useState({ users: false, buses: false });
  const [newUser, setNewUser] = useState({ id: null, username: '', email: '', role: '', cinNumber: '', password: '', licenseNumber: '' });
  const [newBus, setNewBus] = useState({ id: null, busNumber: '', route: '', driver: '', temperature: '', humidity: '', pression: '', flame: false, latitude: '', longitude: '', positionId: '' });
  const [options, setOptions] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [opening, setOpening] = useState(false);
  const navigate = useNavigate();

  // Charger les utilisateurs au démarrage
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/users', {
          headers: { 'Authorization': 'Bearer ' + (getWithExpiry('TOKEN') || 'VOTRE_TOKEN_ICI') },
        });
        const data = await response.json();
        console.log('Fetched users:', data);
        if (response.ok) {
          setUsers(data.map(user => ({
            id: user._id,
            username: user.username,
            email: user.email,
            role: user.role,
            cinNumber: user.myadmin || '',
            password: '', // Masqué comme dans le backend
            licenseNumber: user.role === 'conducteur' ? user.licenseNumber || '' : ''
          })));
        } else {
          console.error('Failed to fetch users:', data.message);
        }
      } catch (error) {
        console.error('Error fetching users:', error.message);
      }
    };
    fetchUsers();
  }, []);

  // Charger les bus au démarrage
  useEffect(() => {
    const fetchBuses = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/vehicles');
        const data = await response.json();
        console.log('Fetched buses:', data);
        if (response.ok) {
          setBuses(data.map(bus => ({
            id: bus._id,
            busNumber: bus.uniqueId,
            route: bus.name,
            driver: bus.driver || '',
            temperature: bus.temperature || '',
            humidity: bus.humidity || '',
            pression: bus.pression || '',
            flame: bus.flame || false,
            latitude: bus.latitude || '',
            longitude: bus.longitude || '',
            positionId: bus.positionId || ''
          })));
        } else {
          console.error('Failed to fetch buses:', data.message);
        }
      } catch (error) {
        console.error('Error fetching buses:', error.message);
      }
    };
    fetchBuses();
  }, []);

  // Charger les agences pour l'utilisateur
  useEffect(() => {
    const fetchAgencies = async () => {
      setLoading(true);
      try {
        const token = getWithExpiry('TOKEN');
        if (!token) {
          setErrorMsg('Token expiré ou non trouvé');
          setOpening(true);
          navigate('/login');
          return;
        }

        const response = await fetch(`${process.env.REACT_APP_URL_NAME}/useragences?userId=${_userId}`, {
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });
        if (response.ok) {
          const data = await response.json();
          console.log('Agencies::', data);
          setOptions([]);
          const newOption = [];
          for (let i = 0; i < data.length; i++) {
            console.log('data agency:', data[i].agence_name);
            newOption.push({ value: data[i].agence_name, label: data[i].agence_name });
          }
          setOptions(newOption);
          setItems(data);
        } else if (response.status === 401) {
          setErrorMsg('UNAUTHORIZED');
          setOpening(true);
          navigate('/login');
        } else {
          setErrorMsg(await response.text());
          setOpening(true);
          throw new Error(await response.text());
        }
      } catch (error) {
        console.error('Error fetching agencies:', error.message);
      } finally {
        setLoading(false);
      }
    };
    if (_userId) fetchAgencies();
  }, [_userId]);

  const handleSubmitUser = async (e) => {
    e.preventDefault();
    if (!newUser.username || !newUser.email || !newUser.role || !newUser.cinNumber) {
      console.error('Tous les champs obligatoires sont requis');
      return;
    }

    const userToAdd = {
      username: newUser.username,
      email: newUser.email,
      role: newUser.role,
      myadmin: newUser.cinNumber
    };
    if (newUser.role === 'parent') userToAdd.password = newUser.password;
    if (newUser.role === 'conducteur') userToAdd.licenseNumber = newUser.licenseNumber;

    console.log('Sending user data:', userToAdd);

    try {
      const method = newUser.id ? 'PUT' : 'POST';
      const url = newUser.id 
        ? `http://localhost:5000/api/users/${newUser.id}`
        : 'http://localhost:5000/api/users';

      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + (getWithExpiry('TOKEN') || 'VOTRE_TOKEN_ICI') },
        body: JSON.stringify(userToAdd),
      });
      console.log('Response status:', response.status);
      const data = await response.json();
      console.log('Response data:', data);

      if (response.ok) {
        if (newUser.id) {
          setUsers(users.map(user => user.id === newUser.id ? {
            id: newUser.id,
            username: data.username,
            email: data.email,
            role: data.role,
            cinNumber: data.myadmin,
            password: '',
            licenseNumber: data.role === 'conducteur' ? data.licenseNumber || '' : ''
          } : user));
        } else {
          setUsers([...users, {
            id: data._id,
            username: data.username,
            email: data.email,
            role: data.role,
            cinNumber: data.myadmin,
            password: '',
            licenseNumber: data.role === 'conducteur' ? data.licenseNumber || '' : ''
          }]);
        }
        setNewUser({ id: null, username: '', email: '', role: '', cinNumber: '', password: '', licenseNumber: '' });
        setShowForm({ ...showForm, users: false });
      } else {
        console.error('Failed to save user:', data.message);
      }
    } catch (error) {
      console.error('Error saving user:', error.message);
    }
  };

  const handleSubmitBus = async (e) => {
    e.preventDefault();
    if (!newBus.busNumber || !newBus.route) {
      console.error('Numéro de bus et Itinéraire sont requis');
      return;
    }

    const busToAdd = {
      uniqueId: newBus.busNumber,
      name: newBus.route,
      temperature: newBus.temperature,
      humidity: newBus.humidity,
      pression: newBus.pression,
      flame: newBus.flame,
      latitude: newBus.latitude,
      longitude: newBus.longitude,
      positionId: newBus.positionId
    };
    console.log('Sending bus data:', busToAdd);

    try {
      const method = newBus.id ? 'PUT' : 'POST';
      const url = newBus.id 
        ? `http://localhost:5000/api/vehicles/${newBus.id}`
        : 'http://localhost:5000/api/vehicles';

      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(busToAdd),
      });
      console.log('Response status:', response.status);
      const data = await response.json();
      console.log('Response data:', data);

      if (response.ok) {
        if (newBus.id) {
          setBuses(buses.map(bus => bus.id === newBus.id ? {
            id: newBus.id,
            busNumber: data.uniqueId,
            route: data.name,
            driver: newBus.driver,
            temperature: data.temperature,
            humidity: data.humidity,
            pression: data.pression,
            flame: data.flame,
            latitude: data.latitude,
            longitude: data.longitude,
            positionId: data.positionId
          } : bus));
        } else {
          setBuses([...buses, {
            id: data._id,
            busNumber: data.uniqueId,
            route: data.name,
            driver: newBus.driver,
            temperature: data.temperature,
            humidity: data.humidity,
            pression: data.pression,
            flame: data.flame,
            latitude: data.latitude,
            longitude: data.longitude,
            positionId: data.positionId
          }]);
        }
        setNewBus({ id: null, busNumber: '', route: '', driver: '', temperature: '', humidity: '', pression: '', flame: false, latitude: '', longitude: '', positionId: '' });
        setShowForm({ ...showForm, buses: false });
      } else {
        console.error('Failed to save bus:', data.message);
      }
    } catch (error) {
      console.error('Error saving bus:', error.message);
    }
  };

  const handleEditUser = (user) => {
    setNewUser({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      cinNumber: user.cinNumber,
      password: user.password || '',
      licenseNumber: user.role === 'conducteur' ? user.licenseNumber || '' : ''
    });
    setShowForm({ ...showForm, users: true });
  };

  const handleEditBus = (bus) => {
    setNewBus({
      id: bus.id,
      busNumber: bus.busNumber,
      route: bus.route,
      driver: bus.driver,
      temperature: bus.temperature,
      humidity: bus.humidity,
      pression: bus.pression,
      flame: bus.flame,
      latitude: bus.latitude,
      longitude: bus.longitude,
      positionId: bus.positionId
    });
    setShowForm({ ...showForm, buses: true });
  };

  const handleDeleteUser = async (id) => {
    try {
      const response = await fetch(`http://localhost:5000/api/users/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': 'Bearer ' + (getWithExpiry('TOKEN') || 'VOTRE_TOKEN_ICI') },
      });
      console.log('Delete response status:', response.status);
      const data = await response.json();
      console.log('Delete response data:', data);

      if (response.ok) {
        setUsers(users.filter(user => user.id !== id));
      } else {
        console.error('Failed to delete user:', data.message);
      }
    } catch (error) {
      console.error('Error deleting user:', error.message);
    }
  };

  const handleDeleteBus = async (id) => {
    try {
      const response = await fetch(`http://localhost:5000/api/vehicles/${id}`, {
        method: 'DELETE',
      });
      console.log('Delete response status:', response.status);
      const data = await response.json();
      console.log('Delete response data:', data);

      if (response.ok) {
        setBuses(buses.filter(bus => bus.id !== id));
      } else {
        console.error('Failed to delete bus:', data.message);
      }
    } catch (error) {
      console.error('Error deleting bus:', error.message);
    }
  };

  const handleInputChange = (e, type) => {
    const { name, value, type: inputType, checked } = e.target;
    if (type === 'user') {
      setNewUser({ ...newUser, [name]: value });
    } else if (type === 'bus') {
      setNewBus({ ...newBus, [name]: inputType === 'checkbox' ? checked : value });
    }
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar onSectionChange={setActiveSection} />
      
      <div className="flex-1 flex flex-col w-full">
        <header className="bg-white shadow-sm">
          <div className="w-full mx-auto py-4 px-4 sm:px-6 lg:px-8">
            <h1 className="text-2xl font-bold text-gray-900">
              {activeSection === 'dashboard' ? 'Tableau de bord' : activeSection === 'users' ? 'Utilisateurs' : activeSection === 'buses' ? 'Bus' : 'Statistiques'}
            </h1>
          </div>
        </header>
        
        <main className="flex-1 w-full px-4 sm:px-6 lg:px-8">
          {activeSection === 'dashboard' && <MapSection />}
          
          {activeSection === 'users' && (
            <div className="bg-white rounded-xl shadow-card overflow-hidden">
              <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                <h2 className="text-lg font-semibold text-gray-800">Liste des utilisateurs</h2>
                <button
                  onClick={() => {
                    setNewUser({ id: null, username: '', email: '', role: '', cinNumber: '', password: '', licenseNumber: '' });
                    setShowForm({ ...showForm, users: true });
                  }}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  + Ajouter
                </button>
              </div>
              
              {showForm.users && (
                <div className="p-4 border-b border-gray-100">
                  <form onSubmit={handleSubmitUser} className="space-y-4">
                    <div>
                      <label className="block text-gray-700 text-sm font-medium mb-2" htmlFor="role">
                        Rôle
                      </label>
                      <select
                        id="role"
                        name="role"
                        value={newUser.role}
                        onChange={(e) => handleInputChange(e, 'user')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      >
                        <option value="">Sélectionner un rôle</option>
                        <option value="parent">Parent</option>
                        <option value="conducteur">Conducteur</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-gray-700 text-sm font-medium mb-2" htmlFor="cinNumber">
                        Num CIN
                      </label>
                      <input
                        id="cinNumber"
                        name="cinNumber"
                        type="text"
                        placeholder="Num CIN"
                        value={newUser.cinNumber}
                        onChange={(e) => handleInputChange(e, 'user')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-gray-700 text-sm font-medium mb-2" htmlFor="username">
                        Nom d'utilisateur
                      </label>
                      <input
                        id="username"
                        name="username"
                        type="text"
                        placeholder="Nom d'utilisateur"
                        value={newUser.username}
                        onChange={(e) => handleInputChange(e, 'user')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-gray-700 text-sm font-medium mb-2" htmlFor="email">
                        Email
                      </label>
                      <input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="Email"
                        value={newUser.email}
                        onChange={(e) => handleInputChange(e, 'user')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    {newUser.role === 'parent' && (
                      <div>
                        <label className="block text-gray-700 text-sm font-medium mb-2" htmlFor="password">
                          Mot de passe
                        </label>
                        <input
                          id="password"
                          name="password"
                          type="password"
                          placeholder="Mot de passe"
                          value={newUser.password}
                          onChange={(e) => handleInputChange(e, 'user')}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>
                    )}
                    {newUser.role === 'conducteur' && (
                      <div>
                        <label className="block text-gray-700 text-sm font-medium mb-2" htmlFor="licenseNumber">
                          Numéro de permis
                        </label>
                        <input
                          id="licenseNumber"
                          name="licenseNumber"
                          type="text"
                          placeholder="Numéro de permis"
                          value={newUser.licenseNumber}
                          onChange={(e) => handleInputChange(e, 'user')}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>
                    )}
                    <div className="flex space-x-2">
                      <button
                        type="submit"
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        {newUser.id ? 'Sauvegarder' : 'Ajouter'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowForm({ ...showForm, users: false })}
                        className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
                      >
                        Annuler
                      </button>
                    </div>
                  </form>
                </div>
              )}
              
              <div className="p-4">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Nom d'utilisateur
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Rôle
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Num CIN
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {users.map((user) => (
                      <tr key={user.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.username}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.email}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.role}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.cinNumber}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <button
                            onClick={() => handleEditUser(user)}
                            className="text-blue-600 hover:text-blue-800 mr-4"
                          >
                            Modifier
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            Supprimer
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          
          {activeSection === 'buses' && (
            <div className="bg-white rounded-xl shadow-card overflow-hidden">
              <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                <h1 className="text-lg font-semibold text-gray-800">Liste des bus</h1>
                <button
                  onClick={() => {
                    setNewBus({ id: null, busNumber: '', route: '', driver: '', temperature: '', humidity: '', pression: '', flame: false, latitude: '', longitude: '', positionId: '' });
                    setShowForm({ ...showForm, buses: true });
                  }}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  + Ajouter
                </button>
              </div>
              
              {showForm.buses && (
                <div className="p-4 border-b border-gray-100">
                  <form onSubmit={handleSubmitBus} className="space-y-4">
                    <div>
                      <label className="block text-gray-700 text-sm font-medium mb-2" htmlFor="busNumber">
                        Numéro de bus
                      </label>
                      <input
                        id="busNumber"
                        name="busNumber"
                        type="text"
                        placeholder="Numéro de bus"
                        value={newBus.busNumber}
                        onChange={(e) => handleInputChange(e, 'bus')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-gray-700 text-sm font-medium mb-2" htmlFor="route">
                        Itinéraire
                      </label>
                      <input
                        id="route"
                        name="route"
                        type="text"
                        placeholder="Itinéraire"
                        value={newBus.route}
                        onChange={(e) => handleInputChange(e, 'bus')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-gray-700 text-sm font-medium mb-2" htmlFor="driver">
                        Conducteur
                      </label>
                      <input
                        id="driver"
                        name="driver"
                        type="text"
                        placeholder="Conducteur"
                        value={newBus.driver}
                        onChange={(e) => handleInputChange(e, 'bus')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-700 text-sm font-medium mb-2" htmlFor="temperature">
                        Température
                      </label>
                      <input
                        id="temperature"
                        name="temperature"
                        type="text"
                        placeholder="Température"
                        value={newBus.temperature}
                        onChange={(e) => handleInputChange(e, 'bus')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-700 text-sm font-medium mb-2" htmlFor="humidity">
                        Humidité
                      </label>
                      <input
                        id="humidity"
                        name="humidity"
                        type="text"
                        placeholder="Humidité"
                        value={newBus.humidity}
                        onChange={(e) => handleInputChange(e, 'bus')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-700 text-sm font-medium mb-2" htmlFor="pression">
                        Pression
                      </label>
                      <input
                        id="pression"
                        name="pression"
                        type="text"
                        placeholder="Pression"
                        value={newBus.pression}
                        onChange={(e) => handleInputChange(e, 'bus')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-700 text-sm font-medium mb-2" htmlFor="flame">
                        Flamme
                      </label>
                      <input
                        id="flame"
                        name="flame"
                        type="checkbox"
                        checked={newBus.flame}
                        onChange={(e) => handleInputChange(e, 'bus')}
                        className="w-5 h-5 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-700 text-sm font-medium mb-2" htmlFor="latitude">
                        Latitude
                      </label>
                      <input
                        id="latitude"
                        name="latitude"
                        type="text"
                        placeholder="Latitude"
                        value={newBus.latitude}
                        onChange={(e) => handleInputChange(e, 'bus')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-700 text-sm font-medium mb-2" htmlFor="longitude">
                        Longitude
                      </label>
                      <input
                        id="longitude"
                        name="longitude"
                        type="text"
                        placeholder="Longitude"
                        value={newBus.longitude}
                        onChange={(e) => handleInputChange(e, 'bus')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-700 text-sm font-medium mb-2" htmlFor="positionId">
                        ID de position
                      </label>
                      <input
                        id="positionId"
                        name="positionId"
                        type="text"
                        placeholder="ID de position"
                        value={newBus.positionId}
                        onChange={(e) => handleInputChange(e, 'bus')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="flex space-x-2">
                      <button
                        type="submit"
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        {newBus.id ? 'Sauvegarder' : 'Ajouter'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowForm({ ...showForm, buses: false })}
                        className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
                      >
                        Annuler
                      </button>
                    </div>
                  </form>
                </div>
              )}
              
              <div className="p-4">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Numéro de bus
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Itinéraire
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Conducteur
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Température
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Humidité
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Pression
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Flamme
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Latitude
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Longitude
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        ID de position
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {buses.map((bus) => (
                      <tr key={bus.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{bus.busNumber}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{bus.route}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{bus.driver}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{bus.temperature}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{bus.humidity}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{bus.pression}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{bus.flame ? 'Oui' : 'Non'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{bus.latitude}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{bus.longitude}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{bus.positionId}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <button
                            onClick={() => handleEditBus(bus)}
                            className="text-blue-600 hover:text-blue-800 mr-4"
                          >
                            Modifier
                          </button>
                          <button
                            onClick={() => handleDeleteBus(bus.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            Supprimer
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          
          {activeSection === 'stats' && <StatsSection />}
        </main>
      </div>
    </div>
  );
}