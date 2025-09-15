# Security Policy

## Supported Versions

We actively support the following versions of NagaraTrack Lite:

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

We take the security of NagaraTrack Lite seriously. If you discover a security vulnerability, please follow these steps:

### 1. **Do NOT** create a public GitHub issue

For security vulnerabilities, please do not use the public issue tracker.

### 2. Report privately

Send an email to [security@yourdomain.com] with:
- A description of the vulnerability
- Steps to reproduce the issue
- Potential impact assessment
- Any suggested fixes (if you have them)

### 3. Response timeline

- **Initial Response**: Within 48 hours
- **Status Update**: Within 7 days
- **Fix Timeline**: Within 30 days for critical issues

## Security Best Practices

### For Deployments

1. **Environment Variables**
   - Never commit `.env` files with real credentials
   - Use strong, unique passwords for all services
   - Rotate JWT secrets regularly

2. **Network Security**
   - Use HTTPS in production (SSL/TLS certificates)
   - Configure proper CORS origins
   - Implement rate limiting

3. **Database Security**
   - Use strong database passwords
   - Limit database access to necessary services only
   - Regular backups with encryption

4. **Container Security**
   - Keep base images updated
   - Run containers as non-root users
   - Use minimal base images

### For Development

1. **Dependencies**
   - Regularly update dependencies
   - Use `npm audit` and `pip-audit` to check for vulnerabilities
   - Monitor security advisories

2. **Code Security**
   - Input validation for all user inputs
   - Proper authentication and authorization
   - Secure session management

3. **API Security**
   - Implement proper rate limiting
   - Use HTTPS for all API communications
   - Validate and sanitize all inputs

## Known Security Considerations

### Current Implementation

1. **Authentication**: Uses JWT tokens - ensure proper secret management
2. **File Uploads**: CSV import functionality - validates file types and content
3. **Database**: SQL injection protection through parameterized queries
4. **CORS**: Configurable origins - properly configure for production

### Recommendations for Production

1. **Enable HTTPS**: Use SSL/TLS certificates
2. **Use a Reverse Proxy**: nginx configuration provided
3. **Monitor Logs**: Set up log monitoring and alerting
4. **Regular Updates**: Keep dependencies and base images updated
5. **Backup Security**: Encrypt backups and secure storage

## Security Checklist for Production

- [ ] HTTPS enabled with valid certificates
- [ ] Strong passwords for all services
- [ ] JWT secret is cryptographically secure
- [ ] CORS origins properly configured
- [ ] Rate limiting enabled
- [ ] Security headers configured
- [ ] Database access restricted
- [ ] Backups encrypted and secured
- [ ] Monitoring and alerting enabled
- [ ] Dependencies up to date

## Vulnerability Disclosure

When a security vulnerability is reported:

1. We will acknowledge receipt within 48 hours
2. We will provide a more detailed response within 7 days
3. We will work on a fix and coordinate disclosure
4. We will credit the reporter (unless anonymity is requested)

## Contact

For security-related questions or concerns:
- Email: security@yourdomain.com
- PGP Key: [Link to PGP key if available]

Thank you for helping keep NagaraTrack Lite secure!