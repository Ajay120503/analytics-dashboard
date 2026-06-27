"""Persistent data store for parsed dataframes using feather files."""
import os
import threading
import tempfile


class DataStore:
    def __init__(self):
        self._lock = threading.Lock()
        self._cache = {}
        self._storage_dir = os.path.join(tempfile.gettempdir(), "analytics_dashboard_store")
        os.makedirs(self._storage_dir, exist_ok=True)

    def store(self, file_id: str, df, column_types: dict) -> None:
        """Store a dataframe to both memory cache and disk (feather format)."""
        with self._lock:
            self._cache[file_id] = {
                "df": df,
                "column_types": column_types,
            }
            # Save to disk as feather for persistence across restarts
            try:
                feather_path = os.path.join(self._storage_dir, f"{file_id}.feather")
                df.reset_index(drop=True).to_feather(feather_path)
                import json
                types_path = os.path.join(self._storage_dir, f"{file_id}_types.json")
                with open(types_path, "w") as f:
                    json.dump(column_types, f)
            except Exception as e:
                print(f"Warning: Could not persist data to disk: {e}")

    def get(self, file_id: str):
        """Retrieve a dataframe from cache or disk."""
        with self._lock:
            # Check memory cache first
            if file_id in self._cache:
                return self._cache[file_id]

        # Try loading from disk
        try:
            import pandas as pd
            import json
            feather_path = os.path.join(self._storage_dir, f"{file_id}.feather")
            types_path = os.path.join(self._storage_dir, f"{file_id}_types.json")
            if os.path.exists(feather_path) and os.path.exists(types_path):
                df = pd.read_feather(feather_path)
                with open(types_path, "r") as f:
                    column_types = json.load(f)
                # Cache it
                with self._lock:
                    self._cache[file_id] = {"df": df, "column_types": column_types}
                return self._cache[file_id]
        except Exception as e:
            print(f"Warning: Could not load data from disk: {e}")

        return None

    def remove(self, file_id: str) -> None:
        with self._lock:
            self._cache.pop(file_id, None)
        try:
            for fname in [f"{file_id}.feather", f"{file_id}_types.json"]:
                path = os.path.join(self._storage_dir, fname)
                if os.path.exists(path):
                    os.remove(path)
        except Exception:
            pass

    def clear(self) -> None:
        with self._lock:
            self._cache.clear()
        try:
            for fname in os.listdir(self._storage_dir):
                os.remove(os.path.join(self._storage_dir, fname))
        except Exception:
            pass


data_store = DataStore()
