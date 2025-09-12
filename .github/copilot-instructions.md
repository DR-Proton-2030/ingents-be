# Ingents Node Server - Copilot Instructions

## Architecture Overview

This is a Node.js/Express API server with MongoDB and AWS S3 integration, using a versioned API structure (`/api/v1/`). The project follows a clear separation of concerns with controllers, services, models, and middleware.

### Key Patterns

**File Structure Convention:**

- Controllers in `/api/v1/controller/` with nested folders by feature (e.g., `auth/auth.controller.ts`)
- Models split into `.model.ts` (mongoose model) and `.schema.ts` (schema definition)
- Services in `/services/` as pure functions for business logic
- Interfaces in `/types/interface/` with descriptive names (e.g., `user.interface.ts`)

**Mongoose Schema Pattern:**

```typescript
// Always use SCHEMA_DEFINITION_PROPERTY constants from model.constant.ts
email: { ...SCHEMA_DEFINITION_PROPERTY.requiredString, unique: true }
company_object_id: SCHEMA_DEFINITION_PROPERTY.requiredObjectId

// Use GENERAL_SCHEMA_OPTIONS for consistent schema options
const userSchema = new Schema<IUser>({...}, GENERAL_SCHEMA_OPTIONS);
```

**Authentication Flow:**

- JWT tokens in cookies with `httpOnly: true` and environment-specific settings
- `userAuth` middleware extracts token from cookies OR `Authorization` header
- Token payload structure: `{ company_object_id, _id, role }`
- User data attached to `req.user` via Express type extension in `@types/express/`

**Transaction Pattern:**

```typescript
const session = await mongoose.startSession();
session.startTransaction();
try {
  // Database operations with { session }
  await session.commitTransaction();
} catch (error) {
  if (session.inTransaction()) await session.abortTransaction();
  throw error;
} finally {
  session.endSession();
}
```

**File Upload Pattern:**

- Use `upload.fields()` from multer middleware for multiple file types
- Chain `fileUploadHelper` middleware to auto-upload to S3
- Files become URLs in `req.body` (single file = string, multiple = array)
- Example: `.post("/signup", upload.fields([{name: "company_logo", maxCount: 1}]), fileUploadHelper, signUp)`

## Development Commands

```bash
# Start development server with hot reload
npm run start:dev

# Uses ts-node-dev pointing to src/index.ts
# Server runs on port from .env with colored console output
```

## Version Management & Release Process

**Git Tagging System:**

```bash
# Create a new release tag
git tag -a v1.x.x -m "Release v1.x.x: Description of changes"

# Push tags to remote
git push origin --tags

# List all tags
git tag -l

# Delete a tag (if needed)
git tag -d v1.x.x
git push origin --delete v1.x.x
```

**Semantic Versioning Convention:**

- `v1.0.0` - Major release (breaking changes)
- `v1.1.0` - Minor release (new features, backward compatible)
- `v1.1.1` - Patch release (bug fixes)

**Release Workflow:**

1. Complete development work on feature branch
2. Merge to main branch via PR
3. Update version in `package.json`
4. Create git tag with descriptive message
5. Push tag to trigger deployment pipeline
6. Document changes in release notes

## Environment Configuration

Key environment variables in `.env`:

- `MONGO_URI` - MongoDB connection string with 40s timeout
- `JWT_SECRET` - Token signing secret
- `NODE_ENV` - Controls cookie security and CORS settings
- `MAIL_SERVER_URL` - External mail service endpoint
- AWS credentials are currently hardcoded in `aws.config.ts` (⚠️ security concern)

## Service Integration

**Mail Service**: Uses `callMailServer()` with template names (e.g., "welcome") and recipient data
**S3 Upload**: Auto-generates timestamped filenames with proper MIME types
**Password Handling**: Always use `hashPassword()` for storage, `comparePassword()` for verification

## Common Patterns

- All routes require explicit middleware chaining: `userAuth, upload, fileUploadHelper, controller`
- Error responses follow `{ message: string, error?: any }` structure
- Success responses use `{ message: string, data: object }` structure
- Database queries use `.populate()` for virtual references (see `company_details` in user schema)
- All async operations include comprehensive error handling with transaction rollback

## Commit Convention

**Format:** `type(scope): description`

**Types:**

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code formatting changes
- `refactor`: Code refactoring
- `test`: Adding/updating tests
- `chore`: Maintenance tasks

**Examples:**

```bash
git commit -m "feat(auth): add Google OAuth integration"
git commit -m "fix(upload): handle S3 upload timeout errors"
git commit -m "docs: update API documentation"
```
