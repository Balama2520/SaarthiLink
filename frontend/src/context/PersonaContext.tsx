import React, { createContext, useContext, useState, useEffect } from 'react';

export type PersonaType = 'undergrad' | 'mtech' | 'phd' | 'ms_abroad' | 'professional' | null;

interface PersonaContextType {
  persona: PersonaType;
  setPersona: (persona: PersonaType) => void;
}

const PersonaContext = createContext<PersonaContextType | undefined>(undefined);

export const PersonaProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [persona, setPersonaState] = useState<PersonaType>(null);

  useEffect(() => {
    const saved = localStorage.getItem('saarthi_persona');
    if (saved) {
      setPersonaState(saved as PersonaType);
    }
  }, []);

  const setPersona = (p: PersonaType) => {
    setPersonaState(p);
    if (p) {
      localStorage.setItem('saarthi_persona', p);
    } else {
      localStorage.removeItem('saarthi_persona');
    }
  };

  return (
    <PersonaContext.Provider value={{ persona, setPersona }}>
      {children}
    </PersonaContext.Provider>
  );
};

export const usePersona = () => {
  const context = useContext(PersonaContext);
  if (!context) {
    throw new Error('usePersona must be used within a PersonaProvider');
  }
  return context;
};
