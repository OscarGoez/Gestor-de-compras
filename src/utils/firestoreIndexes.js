// Información sobre los índices necesarios para Firestore
export const requiredIndexes = [
  {
    description: "Para consultar productos por householdId ordenados por updatedAt",
    collection: "products",
    fields: [
      { fieldPath: "householdId", order: "ASCENDING" },
      { fieldPath: "updatedAt", order: "DESCENDING" },
      { fieldPath: "__name__", order: "ASCENDING" }
    ],
    queryScope: "COLLECTION"
  },
  {
    description: "Para consultar productos por householdId y status",
    collection: "products",
    fields: [
      { fieldPath: "householdId", order: "ASCENDING" },
      { fieldPath: "status", order: "ASCENDING" },
      { fieldPath: "__name__", order: "ASCENDING" }
    ],
    queryScope: "COLLECTION"
  },
  {
    description: "Para consultar lista de compras por householdId",
    collection: "shoppingList",
    fields: [
      { fieldPath: "householdId", order: "ASCENDING" },
      { fieldPath: "checked", order: "ASCENDING" },
      { fieldPath: "addedAt", order: "DESCENDING" },
      { fieldPath: "__name__", order: "ASCENDING" }
    ],
    queryScope: "COLLECTION"
  }
];

// Función para generar enlaces de creación de índices
export function getIndexCreationLinks(projectId) {
  const baseUrl = `https://console.firebase.google.com/v1/r/project/${projectId}/firestore/indexes`;
  
  return requiredIndexes.map(index => {
    const params = new URLSearchParams({
      create_composite: generateCompositeIndexString(index)
    });
    return `${baseUrl}?${params.toString()}`;
  });
}

// Función auxiliar para generar string de índice compuesto
function generateCompositeIndexString(index) {
  const fieldsString = index.fields.map(f => 
    `${f.fieldPath}:${f.order === "DESCENDING" ? "DESC" : "ASC"}`
  ).join('~');
  
  return `Ckpwcm9qZWN0cy8.../${index.collection}/indexes/${fieldsString}`;
}

// Función para verificar si estamos en modo desarrollo
export function isDevelopmentMode() {
  return !import.meta.env.VITE_FIREBASE_API_KEY || 
         import.meta.env.VITE_FIREBASE_API_KEY.includes('demo');
}