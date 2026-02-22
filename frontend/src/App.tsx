import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { NewOrder } from './pages/NewOrder';
import { ManufacturerOrder } from './pages/ManufacturerOrder';
import { ManufacturerOrderList } from './pages/ManufacturerOrderList';
import { Buyback } from './pages/Buyback';
import { Fulfillment } from './pages/Fulfillment';
import { SellBack } from './pages/SellBack';
import { ManufacturerReceive } from './pages/ManufacturerReceive';
import { Orders } from './pages/Orders';
import { SwapProducts } from './pages/SwapProducts';
import { StoreList } from './pages/StoreList';
import { Customers } from './pages/Customers';
import { UsersPage } from './pages/Users';
import { FinancialManagement } from './pages/FinancialManagement';
import { EditOrderList } from './pages/EditOrderList';
import { EditOrder } from './pages/EditOrder';
import { EditManufacturerOrder } from './pages/EditManufacturerOrder';
import { type ReactNode } from 'react';

function PrivateRoute({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  return user ? <>{children}</> : <Navigate to="/login" replace />;
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/orders"
            element={
              <PrivateRoute>
                <Orders />
              </PrivateRoute>
            }
          />
          <Route
            path="/orders/new"
            element={
              <PrivateRoute>
                <NewOrder />
              </PrivateRoute>
            }
          />
          <Route
            path="/manufacturer-order"
            element={
              <PrivateRoute>
                <ManufacturerOrder />
              </PrivateRoute>
            }
          />
          <Route
            path="/manufacturer-orders"
            element={
              <PrivateRoute>
                <ManufacturerOrderList />
              </PrivateRoute>
            }
          />
          <Route
            path="/buyback"
            element={
              <PrivateRoute>
                <Buyback />
              </PrivateRoute>
            }
          />
          <Route
            path="/fulfillment"
            element={
              <PrivateRoute>
                <Fulfillment />
              </PrivateRoute>
            }
          />
          <Route
            path="/sell-back"
            element={
              <PrivateRoute>
                <SellBack />
              </PrivateRoute>
            }
          />
          <Route
            path="/manufacturer-receive"
            element={
              <PrivateRoute>
                <ManufacturerReceive />
              </PrivateRoute>
            }
          />
          <Route
            path="/swap-products"
            element={
              <PrivateRoute>
                <SwapProducts />
              </PrivateRoute>
            }
          />
          <Route
            path="/stores"
            element={
              <PrivateRoute>
                <StoreList />
              </PrivateRoute>
            }
          />
          <Route
            path="/customers"
            element={
              <PrivateRoute>
                <Customers />
              </PrivateRoute>
            }
          />
          <Route
            path="/users"
            element={
              <PrivateRoute>
                <UsersPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/financial-management"
            element={
              <PrivateRoute>
                <FinancialManagement />
              </PrivateRoute>
            }
          />
          <Route
            path="/edit-orders"
            element={
              <PrivateRoute>
                <EditOrderList />
              </PrivateRoute>
            }
          />
          <Route
            path="/edit-order/:id"
            element={
              <PrivateRoute>
                <EditOrder />
              </PrivateRoute>
            }
          />
          <Route
            path="/edit-manufacturer-order/:id"
            element={
              <PrivateRoute>
                <EditManufacturerOrder />
              </PrivateRoute>
            }
          />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
