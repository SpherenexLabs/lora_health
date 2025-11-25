import { createContext, useContext, useEffect, useState } from 'react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { auth, database } from '../firebase/config';
import { ref, set, push, get } from 'firebase/database';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  async function signup(email, password, age) {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Extract name from email (before @)
    const patientName = email.split('@')[0];
    
    // Get current date in DD-MM-YYYY format
    const today = new Date();
    const dateStr = `${String(today.getDate()).padStart(2, '0')}-${String(today.getMonth() + 1).padStart(2, '0')}-${today.getFullYear()}`;
    const basePath = `1_Health_${dateStr}`;
    
    // Store patient data in Firebase under numbered format like sensor data
    const patientsRef = ref(database, `${basePath}/patients`);
    const snapshot = await get(patientsRef);
    let patientNumber = 1;
    
    if (snapshot.exists()) {
      const patients = snapshot.val();
      const numbers = Object.keys(patients)
        .filter(key => key.startsWith('Patient_'))
        .map(key => parseInt(key.split('_')[1]))
        .filter(num => !isNaN(num));
      
      if (numbers.length > 0) {
        patientNumber = Math.max(...numbers) + 1;
      }
    }
    
    // Store in format similar to sensor data structure
    await set(ref(database, `${basePath}/patients/Patient_${patientNumber}_${patientName}`), {
      '1_Email': email,
      '2_Age': parseInt(age),
      '3_UserId': user.uid,
      '4_RegisteredAt': new Date().toISOString(),
      '5_LastLogin': new Date().toISOString()
    });
    
    return userCredential;
  }

  async function login(email, password) {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Get current date in DD-MM-YYYY format
    const today = new Date();
    const dateStr = `${String(today.getDate()).padStart(2, '0')}-${String(today.getMonth() + 1).padStart(2, '0')}-${today.getFullYear()}`;
    const basePath = `1_Health_${dateStr}`;
    
    // Update last login time
    const patientsRef = ref(database, `${basePath}/patients`);
    const snapshot = await get(patientsRef);
    if (snapshot.exists()) {
      const patients = snapshot.val();
      for (const [key, patient] of Object.entries(patients)) {
        if (patient['3_UserId'] === user.uid) {
          await set(ref(database, `${basePath}/patients/${key}/5_LastLogin`), new Date().toISOString());
          break;
        }
      }
    }
    
    return userCredential;
  }

  function adminLogin(email, password) {
    if (email === 'admin@gmail.com' && password === 'admin123') {
      setIsAdmin(true);
      return Promise.resolve({ user: { email: 'admin@gmail.com' } });
    }
    return Promise.reject(new Error('Invalid admin credentials'));
  }

  function logout() {
    setIsAdmin(false);
    return signOut(auth);
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    isAdmin,
    signup,
    login,
    adminLogin,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
