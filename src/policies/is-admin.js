module.exports = async (policyContext, config, { strapi }) => {
  const { user } = policyContext.state;

  if (!user) {
    return false;
  }

  // Allow if user is authenticated (basic check)
  // You can add more specific admin role checks here if needed
  if (user.id) {
    return true;
  }

  return false;
};