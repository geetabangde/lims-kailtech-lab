// src/app/contexts/NavigationProvider.jsx
import { createContext, useContext, useState, useEffect } from 'react';
import { useLabList } from 'hooks/useLabList';
import { createDashboardsNavigation } from 'app/navigation/dashboards';

const NavigationContext = createContext({
  navigation: [],
  loading: true,
  error: null,
});

export const useNavigation = () => {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within NavigationProvider');
  }
  return context;
};

export const NavigationProvider = ({ children }) => {
  const { labs, loading, error } = useLabList();
  const [navigation, setNavigation] = useState([]);

  useEffect(() => {
    if (!loading && labs.length > 0) {
      // Create dynamic navigation with fetched labs
      const dashboardsNav = createDashboardsNavigation(labs);

      // You can add other navigation items here
      setNavigation([dashboardsNav /* , other nav items */]);
    }
  }, [labs, loading]);

  return (
    <NavigationContext.Provider value={{ navigation, loading, error }}>
      {children}
    </NavigationContext.Provider>
  );
};