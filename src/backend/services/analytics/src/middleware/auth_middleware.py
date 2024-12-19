import os
import time
import uuid
from typing import Dict, List, Any, Optional
from contextlib import asynccontextmanager

# External imports
from fastapi import Request, HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from pydantic import BaseModel
import redis

# Internal imports
from ....shared.utils.logger import Logger
from ....shared.utils.metrics import MetricsService

# Security constants
JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY')
JWT_ALGORITHM = 'RS256'
REQUIRED_ROLES = ['admin', 'analyst', 'manager']
TOKEN_EXPIRY = 3600  # 1 hour
RATE_LIMIT_ATTEMPTS = 100  # requests per hour
RATE_LIMIT_WINDOW = 3600  # 1 hour

# Security bearer scheme
security = HTTPBearer()

class TokenPayload(BaseModel):
    """Pydantic model for JWT token payload validation"""
    sub: str
    roles: List[str]
    exp: int
    iat: int
    jti: str

class AuthMiddleware:
    """Authentication middleware with comprehensive security features"""

    def __init__(self, logger: Logger, metrics: MetricsService, redis_client: redis.Redis):
        """Initialize auth middleware with required services"""
        self.logger = logger
        self.metrics = metrics
        self.redis_client = redis_client
        self.token_blacklist_prefix = "token_blacklist:"
        self.rate_limit_prefix = "rate_limit:"

    async def authenticate(self, request: Request, required_roles: List[str]) -> Dict[str, Any]:
        """Main authentication middleware function"""
        correlation_id = str(uuid.uuid4())
        start_time = time.time()

        try:
            # Extract token from authorization header
            auth: HTTPAuthorizationCredentials = await security(request)
            if not auth:
                raise HTTPException(status_code=401, detail="Missing authentication token")

            # Check rate limiting
            client_ip = request.client.host
            rate_key = f"{self.rate_limit_prefix}{client_ip}"
            request_count = self.redis_client.incr(rate_key)
            
            if request_count == 1:
                self.redis_client.expire(rate_key, RATE_LIMIT_WINDOW)
            elif request_count > RATE_LIMIT_ATTEMPTS:
                self.logger.warning(
                    "Rate limit exceeded",
                    {"correlation_id": correlation_id, "ip": client_ip}
                )
                self.metrics.incrementCounter(
                    "auth_rate_limit_exceeded",
                    {"ip": client_ip}
                )
                raise HTTPException(status_code=429, detail="Too many requests")

            # Verify token
            token_payload = await self.verify_token(auth.credentials, correlation_id)

            # Validate roles
            if not self.validate_roles(token_payload.get('roles', []), required_roles, correlation_id):
                raise HTTPException(status_code=403, detail="Insufficient permissions")

            # Record metrics
            self.metrics.incrementCounter(
                "auth_success",
                {"user_id": token_payload.get('sub'), "endpoint": request.url.path}
            )

            # Record latency
            latency = time.time() - start_time
            self.metrics.recordLatency(
                "auth_latency",
                latency,
                {"endpoint": request.url.path}
            )

            return token_payload

        except JWTError as e:
            self.logger.error(
                "JWT validation failed",
                {"correlation_id": correlation_id, "error": str(e)}
            )
            self.metrics.incrementCounter("auth_jwt_error")
            raise HTTPException(status_code=401, detail="Invalid authentication token")

        except HTTPException as e:
            self.logger.error(
                "Authentication failed",
                {"correlation_id": correlation_id, "status": e.status_code, "detail": e.detail}
            )
            self.metrics.incrementCounter(
                "auth_failure",
                {"status_code": str(e.status_code)}
            )
            raise

        except Exception as e:
            self.logger.error(
                "Unexpected authentication error",
                {"correlation_id": correlation_id, "error": str(e)}
            )
            self.metrics.incrementCounter("auth_unexpected_error")
            raise HTTPException(status_code=500, detail="Internal server error")

    async def verify_token(self, token: str, correlation_id: str) -> Dict[str, Any]:
        """Verify and decode JWT token"""
        try:
            # Check token blacklist
            if self.redis_client.get(f"{self.token_blacklist_prefix}{token}"):
                raise HTTPException(status_code=401, detail="Token has been revoked")

            # Decode and verify token
            payload = jwt.decode(
                token,
                JWT_SECRET_KEY,
                algorithms=[JWT_ALGORITHM],
                options={"verify_exp": True}
            )

            # Validate token payload
            token_data = TokenPayload(**payload)

            # Cache validated token
            cache_key = f"validated_token:{token}"
            self.redis_client.setex(
                cache_key,
                TOKEN_EXPIRY,
                "1"
            )

            self.logger.info(
                "Token verified successfully",
                {
                    "correlation_id": correlation_id,
                    "user_id": token_data.sub,
                    "token_id": token_data.jti
                }
            )

            return payload

        except JWTError as e:
            self.logger.error(
                "Token verification failed",
                {"correlation_id": correlation_id, "error": str(e)}
            )
            raise

    def validate_roles(self, user_roles: List[str], required_roles: List[str], correlation_id: str) -> bool:
        """Validate user roles against required roles"""
        has_required_role = any(role in required_roles for role in user_roles)
        
        self.logger.info(
            "Role validation completed",
            {
                "correlation_id": correlation_id,
                "user_roles": user_roles,
                "required_roles": required_roles,
                "has_access": has_required_role
            }
        )

        self.metrics.incrementCounter(
            "role_validation",
            {"success": str(has_required_role)}
        )

        return has_required_role

@asynccontextmanager
async def get_current_user(token: str = Security(security), correlation_id: str = None) -> Dict[str, Any]:
    """Helper function to get current authenticated user"""
    if not correlation_id:
        correlation_id = str(uuid.uuid4())

    try:
        auth_middleware = AuthMiddleware(
            logger=Logger("analytics_auth"),
            metrics=MetricsService("analytics_auth"),
            redis_client=redis.Redis.from_url(os.getenv('REDIS_URL', 'redis://localhost:6379'))
        )

        user = await auth_middleware.authenticate(token, REQUIRED_ROLES)
        yield user

    except Exception as e:
        raise HTTPException(
            status_code=401,
            detail=f"Authentication failed: {str(e)}"
        )