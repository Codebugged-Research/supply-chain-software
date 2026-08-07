class ReferenceManager:
    """
    In-memory cross-collection reference graph and StateStore.
    Resolves foreign key references, parent lookups, and BOM DAG cycle checks.
    """

    def __init__(self):
        self._store = {}
        self._bom_graph = {}  # parentSku -> list of componentSku

    def register(self, collection_name: str, key: str, document: dict):
        """
        Registers a generated entity document into the state store.
        """
        if collection_name not in self._store:
            self._store[collection_name] = {}
        self._store[collection_name][key] = document

        # Track BOM directed graph
        if collection_name == 'bom_master':
            parent = document.get('parentSku')
            component = document.get('componentSku')
            if parent and component:
                if parent not in self._bom_graph:
                    self._bom_graph[parent] = []
                self._bom_graph[parent].append(component)

    def get_keys(self, collection_name: str) -> list[str]:
        """
        Returns list of registered primary keys for a collection.
        """
        return list(self._store.get(collection_name, {}).keys())

    def get_document(self, collection_name: str, key: str) -> dict | None:
        """
        Retrieves a document by primary key from the state store.
        """
        return self._store.get(collection_name, {}).get(key)

    def get_all_documents(self, collection_name: str) -> list[dict]:
        """
        Returns all registered documents for a collection.
        """
        return list(self._store.get(collection_name, {}).values())

    def exists(self, collection_name: str, key: str) -> bool:
        """
        Checks if primary key exists in state store.
        """
        return key in self._store.get(collection_name, {})

    def validate_bom_dag(self) -> bool:
        """
        Executes Depth-First Search (DFS) to verify BOM hierarchy contains no circular assembly loops.
        """
        visited = set()
        recursion_stack = set()

        def dfs(node):
            visited.add(node)
            recursion_stack.add(node)
            for neighbor in self._bom_graph.get(node, []):
                if neighbor not in visited:
                    if dfs(neighbor):
                        return True
                elif neighbor in recursion_stack:
                    return True
            recursion_stack.remove(node)
            return False

        for node in list(self._bom_graph.keys()):
            if node not in visited:
                if dfs(node):
                    return False  # Cycle detected!
        return True  # Valid DAG
