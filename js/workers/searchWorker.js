// c:\Users\demir\OneDrive\Рабочий стол\TOPIK APP\searchWorker.js

self.onmessage = function(e) {
    const { type, data, query } = e.data;
    
    if (type === 'SET_DATA') {
        self.dataStore = data;
    } else if (type === 'SEARCH') {
        if (!self.dataStore) {
            self.postMessage([]);
            return;
        }
        
        if (!query) {
            // Если запрос пустой, возвращаем null, чтобы UI использовал полный список
            self.postMessage(null);
            return;
        }
        
        const lowerQuery = query.toLowerCase();
        // Фильтрация по заранее подготовленной строке _searchStr
        const results = self.dataStore.filter(w => 
            w._searchStr && w._searchStr.includes(lowerQuery)
        );
        self.postMessage(results);
    }
};
