# 0001: Role-Enforced Dual OAuth Providers

We decided to partition user authentication strictly by provider: Freelancers authenticate exclusively through GitHub OAuth, and Clients authenticate exclusively through Google OAuth. This cleanly enforces role-based access control at the identity provider level, preventing role ambiguity, ensuring Freelancers always provide repository access, and giving Clients a frictionless one-click Google sign-in.
