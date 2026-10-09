import http from 'k6/http';
import { check, sleep, group } from 'k6';

// Configuración del volumen de la prueba
export const options = {
  stages: [
    { duration: '30s', target: 20 }, // Rampa de subida a 20 usuarios virtuales en 30s
    { duration: '1m', target: 20 }, // Mantiene 20 usuarios virtuales por 1 minuto
    { duration: '30s', target: 0 }, // Rampa de bajada a 0 usuarios
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],
    'http_req_duration{name:CreateCustomer}': ['p(95)<500'], // Umbral específico para Creación
    'http_req_duration{name:ListCustomers}': ['p(95)<500'], // Umbral específico para Listar
    'http_req_duration{name:GetOneCustomer}': ['p(95)<500'], // Umbral específico para Buscar Uno
    'http_req_duration{name:DeleteCustomer}': ['p(95)<500'], // Umbral específico para Eliminar
    http_req_failed: ['rate<0.01'],
  },
};

// URL base de tu API local o entorno de pruebas
const BASE_URL = 'http://localhost:3000';

export default function () {
  let customerId;

  // 1. Prueba de Volumen: Crear un Customer
  group('Create Customer', () => {
    const payload = JSON.stringify({
      document: `${Math.floor(Math.random() * 1000000000)}`, // Generamos un documento aleatorio para que sea único
      name: 'Test',
      lastName: `Customer ${Math.floor(Math.random() * 10000)}`,
      email: `customer${Math.floor(Math.random() * 10000000)}@test.com`,
      phone: '1234567890',
    });
    const params = {
      headers: { 'Content-Type': 'application/json' },
      tags: { name: 'CreateCustomer' },
    };

    // Apuntamos a la ruta correcta: /customers/create
    const postRes = http.post(`${BASE_URL}/customers/create`, payload, params);
    check(postRes, { 'creado exitosamente (201)': (r) => r.status === 201 });

    if (postRes.status !== 201) {
      console.error(
        `[POST /customers/create] Falló con estado ${postRes.status}: ${postRes.body}`,
      );
    } else {
      customerId = postRes.json('id'); // Extraemos el ID generado
    }
  });

  // 2. Prueba de Volumen: Consultar Customers (Listar todos)
  group('List Customers', () => {
    // Apuntamos a la ruta correcta: /customers/all
    const getRes = http.get(`${BASE_URL}/customers/all`, {
      tags: { name: 'ListCustomers' },
    });
    check(getRes, { 'obtenidos exitosamente (200)': (r) => r.status === 200 });
  });

  if (customerId) {
    // 3. Prueba de Volumen: Consultar un solo Customer
    group('Get One Customer', () => {
      const getOneRes = http.get(`${BASE_URL}/customers/${customerId}`, {
        tags: { name: 'GetOneCustomer' },
      });
      check(getOneRes, { 'obtenido uno exitosamente (200)': (r) => r.status === 200 });
    });

    // 4. Prueba de Volumen: Eliminar el Customer
    group('Delete Customer', () => {
      const delRes = http.del(`${BASE_URL}/customers/${customerId}`, null, {
        tags: { name: 'DeleteCustomer' },
      });
      check(delRes, {
        'eliminado exitosamente': (r) => r.status === 200 || r.status === 204,
      }); // NestJS por defecto devuelve 200 en Delete
    });
  }

  // Pausa simulando el tiempo de pensamiento de un usuario real
  sleep(1);
}
