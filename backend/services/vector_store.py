from typing import List, Dict, Any, Optional
import chromadb
from chromadb.config import Settings
from sentence_transformers import SentenceTransformer
import asyncio
from concurrent.futures import ThreadPoolExecutor
import uuid

from core.config import settings

class VectorStoreService:
    def __init__(self):
        self.client = chromadb.Client(Settings(
            chroma_db_impl="duckdb+parquet",
            persist_directory="./chroma_db"
        ))
        self.embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
        self.executor = ThreadPoolExecutor(max_workers=3)
        
        # Create or get collection
        self.collection_name = settings.VECTOR_DB_COLLECTION
        try:
            self.collection = self.client.get_collection(self.collection_name)
        except:
            self.collection = self.client.create_collection(
                name=self.collection_name,
                metadata={"description": "Hackathon documents for AI Co-Mentor"}
            )
    
    async def add_documents(self, hackathon_id: str, documents: List[Dict[str, Any]]) -> int:
        """Add documents to vector store for a hackathon"""
        try:
            # Prepare documents
            texts = []
            metadatas = []
            ids = []
            
            for doc in documents:
                text = doc.get("content", "")
                if not text.strip():
                    continue
                
                # Chunk the document if it's too long
                chunks = self._chunk_text(text, chunk_size=1000, overlap=200)
                
                for i, chunk in enumerate(chunks):
                    texts.append(chunk)
                    metadatas.append({
                        "hackathon_id": hackathon_id,
                        "document_name": doc.get("name", "Unknown"),
                        "chunk_index": i,
                        "total_chunks": len(chunks),
                        "source": doc.get("source", "upload")
                    })
                    ids.append(f"{hackathon_id}_{doc.get('name', 'doc')}_{i}")
            
            if not texts:
                return 0
            
            # Generate embeddings in parallel
            loop = asyncio.get_event_loop()
            embeddings = await loop.run_in_executor(
                self.executor,
                lambda: self.embedding_model.encode(texts).tolist()
            )
            
            # Add to collection
            self.collection.add(
                embeddings=embeddings,
                documents=texts,
                metadatas=metadatas,
                ids=ids
            )
            
            return len(texts)
            
        except Exception as e:
            print(f"Error adding documents to vector store: {e}")
            return 0
    
    async def search(self, query: str, hackathon_id: str, limit: int = 5) -> List[Dict[str, Any]]:
        """Search for relevant documents"""
        try:
            # Generate query embedding
            loop = asyncio.get_event_loop()
            query_embedding = await loop.run_in_executor(
                self.executor,
                lambda: self.embedding_model.encode([query]).tolist()[0]
            )
            
            # Search with filter
            results = self.collection.query(
                query_embeddings=[query_embedding],
                n_results=limit,
                where={"hackathon_id": hackathon_id}
            )
            
            # Format results
            formatted_results = []
            if results and results.get("documents"):
                for i, doc in enumerate(results["documents"][0]):
                    formatted_results.append({
                        "content": doc,
                        "metadata": results["metadatas"][0][i] if results.get("metadatas") else {},
                        "distance": results["distances"][0][i] if results.get("distances") else None
                    })
            
            return formatted_results
            
        except Exception as e:
            print(f"Error searching vector store: {e}")
            return []
    
    async def delete_hackathon_documents(self, hackathon_id: str) -> bool:
        """Delete all documents for a hackathon"""
        try:
            # Get all documents for the hackathon
            results = self.collection.get(
                where={"hackathon_id": hackathon_id}
            )
            
            if results and results.get("ids"):
                self.collection.delete(ids=results["ids"])
            
            return True
            
        except Exception as e:
            print(f"Error deleting hackathon documents: {e}")
            return False
    
    def _chunk_text(self, text: str, chunk_size: int = 1000, overlap: int = 200) -> List[str]:
        """Split text into overlapping chunks"""
        if len(text) <= chunk_size:
            return [text]
        
        chunks = []
        start = 0
        
        while start < len(text):
            end = start + chunk_size
            
            # Try to end at sentence boundary
            if end < len(text):
                # Look for sentence endings
                sentence_endings = ['.', '!', '?', '\n\n']
                for ending in sentence_endings:
                    pos = text.rfind(ending, start, end)
                    if pos != -1 and pos > start + chunk_size // 2:
                        end = pos + 1  # Include the ending character
                        break
            
            chunks.append(text[start:end])
            start = end - overlap  # Overlap for context
        
        return chunks
    
    async def get_hackathon_document_stats(self, hackathon_id: str) -> Dict[str, Any]:
        """Get statistics about documents for a hackathon"""
        try:
            results = self.collection.get(
                where={"hackathon_id": hackathon_id}
            )
            
            if not results or not results.get("documents"):
                return {
                    "document_count": 0,
                    "chunk_count": 0,
                    "unique_documents": 0
                }
            
            # Count unique documents
            document_names = set()
            for metadata in results.get("metadatas", []):
                document_names.add(metadata.get("document_name", "Unknown"))
            
            return {
                "document_count": len(document_names),
                "chunk_count": len(results["documents"]),
                "unique_documents": len(document_names)
            }
            
        except Exception as e:
            print(f"Error getting document stats: {e}")
            return {
                "document_count": 0,
                "chunk_count": 0,
                "unique_documents": 0
            }

# Singleton instance
vector_store = VectorStoreService()