package auth

import (
	"errors"
	"net/http"
	"net/mail"
	"strings"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"

	"graphly/backend/internal/db"
)

const (
	minPasswordLength = 8
	maxPasswordLength = 72
)

type Handlers struct {
	users     *db.UserRepository
	dummyHash []byte
}

type credentialsRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

func NewHandlers(users *db.UserRepository) *Handlers {
	dummyHash, err := bcrypt.GenerateFromPassword([]byte("dummy-password-for-timing"), bcrypt.DefaultCost)
	if err != nil {
		dummyHash = []byte("$2a$10$Qv3QzxQ5W3eyAlyR1Fn0OeQWGWpZJYG1ChcxrFAuo0xOsyjzAm8h2")
	}

	return &Handlers{
		users:     users,
		dummyHash: dummyHash,
	}
}

func (h *Handlers) Register(c *gin.Context) {
	var req credentialsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}

	email, err := normalizeEmail(req.Email)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := validatePassword(req.Password); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	passwordHash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to process password"})
		return
	}

	user, err := h.users.CreateUser(c.Request.Context(), email, string(passwordHash))
	if err != nil {
		if errors.Is(err, db.ErrEmailAlreadyInUse) {
			c.JSON(http.StatusConflict, gin.H{"error": "email already in use"})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create user"})
		return
	}

	token, err := GenerateToken(user.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate token"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"token": token,
		"user":  user,
	})
}

func (h *Handlers) Login(c *gin.Context) {
	var req credentialsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}

	email, err := normalizeEmail(req.Email)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := validatePassword(req.Password); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userRecord, err := h.users.GetUserByEmail(c.Request.Context(), email)
	hashToCompare := h.dummyHash
	userID := ""
	if err == nil {
		hashToCompare = []byte(userRecord.PasswordHash)
		userID = userRecord.ID
	}

	compareErr := bcrypt.CompareHashAndPassword(hashToCompare, []byte(req.Password))
	if err != nil {
		if !errors.Is(err, db.ErrUserNotFound) {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to authenticate"})
			return
		}

		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid email or password"})
		return
	}

	if compareErr != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid email or password"})
		return
	}

	token, err := GenerateToken(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate token"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"token": token})
}

func (h *Handlers) Me(c *gin.Context) {
	userID, ok := UserIDFromContext(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	user, err := h.users.GetUserByID(c.Request.Context(), userID)
	if err != nil {
		if errors.Is(err, db.ErrUserNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch user"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"user": user})
}

func normalizeEmail(email string) (string, error) {
	normalized := strings.ToLower(strings.TrimSpace(email))
	if normalized == "" {
		return "", errors.New("email is required")
	}

	parsed, err := mail.ParseAddress(normalized)
	if err != nil || parsed.Address != normalized {
		return "", errors.New("invalid email")
	}

	return normalized, nil
}

func validatePassword(password string) error {
	if password == "" {
		return errors.New("password is required")
	}

	if len(password) < minPasswordLength {
		return errors.New("password must be at least 8 characters")
	}

	if len(password) > maxPasswordLength {
		return errors.New("password must be at most 72 characters")
	}

	return nil
}
