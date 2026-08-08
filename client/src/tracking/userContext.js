/*
 * The identity block every analytics payload carries. Extracted so the page,
 * click and mobile-scroll trackers cannot drift into three slightly different
 * shapes for the same field.
 */
export const getUserContext = (user) => {
  if (!user?._id) return undefined;
  return {
    userId: user._id,
    email: user.email || "",
    phone: user.phone || "",
  };
};

export default getUserContext;
