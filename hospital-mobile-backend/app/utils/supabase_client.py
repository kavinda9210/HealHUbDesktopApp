import json
from typing import Optional, Dict, Any, List
from supabase import create_client, Client
from flask import current_app
import logging

logger = logging.getLogger(__name__)

class SupabaseClient:
    """Singleton Supabase client"""
    _instance: Optional[Client] = None
    
    @classmethod
    def get_client(cls) -> Client:
        """Get or create Supabase client instance"""
        if cls._instance is None:
            try:
                supabase_url = current_app.config['SUPABASE_URL']
                supabase_key = current_app.config['SUPABASE_KEY']
                
                if not supabase_url or not supabase_key:
                    raise ValueError("Supabase URL and Key must be set in configuration")
                
                cls._instance = create_client(supabase_url, supabase_key)
                logger.info("Supabase client initialized successfully")
            except Exception as e:
                logger.error(f"Failed to initialize Supabase client: {str(e)}")
                raise
        
        return cls._instance
    
    @classmethod
    def get_service_client(cls) -> Client:
        """Get Supabase client with service role key for admin operations"""
        try:
            supabase_url = current_app.config['SUPABASE_URL']
            service_key = current_app.config['SUPABASE_SERVICE_ROLE_KEY']
            
            if not supabase_url or not service_key:
                raise ValueError("Supabase URL and Service Role Key must be set")
            
            return create_client(supabase_url, service_key)
        except Exception as e:
            logger.error(f"Failed to initialize Supabase service client: {str(e)}")
            raise
    
    @classmethod
    def execute_query(cls, table: str, operation: str = 'select', **kwargs) -> Dict[str, Any]:
        """Execute a query on Supabase table"""
        client = cls.get_client()
        
        try:
            # Get the table reference
            table_ref = client.table(table)
            
            # Execute operation
            if operation == 'select':
                columns = kwargs.pop('columns', kwargs.pop('select', '*'))
                limit = kwargs.pop('limit', None)
                offset = kwargs.pop('offset', None)
                order_by = kwargs.pop('order_by', None)
                order_desc = bool(kwargs.pop('order_desc', False))

                query = table_ref.select(columns)
                
                # Apply filters
                for key, value in kwargs.items():
                    if key.startswith('filter_'):
                        column = key[7:]  # Remove 'filter_' prefix
                        if isinstance(value, tuple) and len(value) == 2:
                            operator, filter_value = value
                            op = str(operator).lower()
                            if op == 'in' and isinstance(filter_value, (list, tuple)):
                                query = query.in_(column, list(filter_value))
                            else:
                                query = query.filter(column, operator, filter_value)
                        else:
                            query = query.eq(column, value)

                if order_by:
                    query = query.order(order_by, desc=order_desc)

                if offset is not None:
                    query = query.range(int(offset), int(offset) + int(limit or 1000) - 1)
                elif limit is not None:
                    query = query.limit(int(limit))
                
                result = query.execute()
                
            elif operation == 'insert':
                rows = kwargs.pop('rows', None)
                payload = rows if rows is not None else kwargs
                result = table_ref.insert(payload).execute()
                
            elif operation == 'update':
                # Separate filters from update data
                filters = {k[7:]: v for k, v in kwargs.items() if k.startswith('filter_')}
                update_data = {k: v for k, v in kwargs.items() if not k.startswith('filter_')}
                
                query = table_ref.update(update_data)
                for column, value in filters.items():
                    query = query.eq(column, value)
                
                result = query.execute()
                
            elif operation == 'delete':
                query = table_ref.delete()
                for key, value in kwargs.items():
                    if key.startswith('filter_'):
                        column = key[7:]
                        query = query.eq(column, value)
                
                result = query.execute()
                
            else:
                raise ValueError(f"Unsupported operation: {operation}")
            
            # Handle response
            if hasattr(result, 'data'):
                return {
                    'success': True,
                    'data': result.data,
                    'count': len(result.data) if result.data else 0
                }
            else:
                return {
                    'success': True,
                    'data': result
                }
                
        except Exception as e:
            logger.error(f"Supabase query failed: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'data': None
            }

    @classmethod
    def execute_admin_query(cls, table: str, operation: str = 'select', **kwargs) -> Dict[str, Any]:
        """Execute a query using the service-role key (bypasses RLS when configured)."""
        try:
            client = cls.get_service_client()
        except Exception:
            # Fall back to normal client if service key isn't configured.
            client = cls.get_client()

        try:
            table_ref = client.table(table)

            if operation == 'select':
                columns = kwargs.pop('columns', kwargs.pop('select', '*'))
                limit = kwargs.pop('limit', None)
                order_by = kwargs.pop('order_by', None)
                order_desc = bool(kwargs.pop('order_desc', False))

                query = table_ref.select(columns)
                for key, value in kwargs.items():
                    if key.startswith('filter_'):
                        column = key[7:]
                        if isinstance(value, tuple) and len(value) == 2:
                            operator, filter_value = value
                            op = str(operator).lower()
                            if op == 'in' and isinstance(filter_value, (list, tuple)):
                                query = query.in_(column, list(filter_value))
                            else:
                                query = query.filter(column, operator, filter_value)
                        else:
                            query = query.eq(column, value)

                if order_by:
                    query = query.order(order_by, desc=order_desc)
                if limit is not None:
                    query = query.limit(int(limit))
                result = query.execute()

            elif operation == 'insert':
                rows = kwargs.pop('rows', None)
                payload = rows if rows is not None else kwargs
                result = table_ref.insert(payload).execute()

            elif operation == 'update':
                filters = {k[7:]: v for k, v in kwargs.items() if k.startswith('filter_')}
                update_data = {k: v for k, v in kwargs.items() if not k.startswith('filter_')}
                query = table_ref.update(update_data)
                for column, value in filters.items():
                    query = query.eq(column, value)
                result = query.execute()

            elif operation == 'delete':
                query = table_ref.delete()
                for key, value in kwargs.items():
                    if key.startswith('filter_'):
                        column = key[7:]
                        query = query.eq(column, value)
                result = query.execute()
            else:
                raise ValueError(f"Unsupported operation: {operation}")

            if hasattr(result, 'data'):
                return {
                    'success': True,
                    'data': result.data,
                    'count': len(result.data) if result.data else 0
                }
            return {'success': True, 'data': result}

        except Exception as e:
            logger.error(f"Supabase admin query failed: {str(e)}")
            return {'success': False, 'error': str(e), 'data': None}
    
    @classmethod
    def rpc(cls, function_name: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a PostgreSQL function (RPC)"""
        client = cls.get_client()
        
        try:
            result = client.rpc(function_name, params).execute()
            return {
                'success': True,
                'data': result.data
            }
        except Exception as e:
            logger.error(f"RPC {function_name} failed: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'data': None
            }

# Helper functions for common operations
def get_user_by_email(email: str) -> Optional[Dict[str, Any]]:
    """Get user by email"""
    result = SupabaseClient.execute_query(
        'users',
        'select',
        filter_email=email
    )
    
    if result['success'] and result['data']:
        return result['data'][0]
    return None

def get_user_by_id(user_id: str) -> Optional[Dict[str, Any]]:
    """Get user by ID"""
    result = SupabaseClient.execute_query(
        'users',
        'select',
        filter_user_id=user_id
    )
    
    if result['success'] and result['data']:
        return result['data'][0]
    return None

def create_user(user_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Create a new user"""
    result = SupabaseClient.execute_query('users', 'insert', **user_data)
    
    if result['success'] and result['data']:
        return result['data'][0]
    return None

def update_user(user_id: str, update_data: Dict[str, Any]) -> bool:
    """Update user information"""
    result = SupabaseClient.execute_query(
        'users',
        'update',
        filter_user_id=user_id,
        **update_data
    )
    
    return result['success']