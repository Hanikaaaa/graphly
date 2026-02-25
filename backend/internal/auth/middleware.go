package auth

import (
	"errors"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

const contextUserIDKey = "auth_user_id"
const contextUserKey = "auth_user"

type ContextUser struct {
	UserID string `json:"userId"`
}

func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "missing authorization header"})
			c.Abort()
			return
		}

		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") || strings.TrimSpace(parts[1]) == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid authorization header"})
			c.Abort()
			return
		}

		claims, err := ParseToken(strings.TrimSpace(parts[1]))
		if err != nil {
			if errors.Is(err, ErrJWTSecretNotSet) {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "auth configuration error"})
				c.Abort()
				return
			}

			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid or expired token"})
			c.Abort()
			return
		}

		if strings.TrimSpace(claims.UserID) == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid token payload"})
			c.Abort()
			return
		}

		c.Set(contextUserIDKey, claims.UserID)
		c.Set("userId", claims.UserID)
		c.Set(contextUserKey, ContextUser{UserID: claims.UserID})
		c.Next()
	}
}

func UserIDFromContext(c *gin.Context) (string, bool) {
	userID, ok := c.Get(contextUserIDKey)
	if !ok {
		return "", false
	}

	value, ok := userID.(string)
	return value, ok && value != ""
}

func UserFromContext(c *gin.Context) (*ContextUser, bool) {
	value, ok := c.Get(contextUserKey)
	if !ok {
		return nil, false
	}

	user, ok := value.(ContextUser)
	if !ok || user.UserID == "" {
		return nil, false
	}

	return &user, true
}
