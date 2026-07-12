module.exports = {
  VENDOR_ROLES: ['vendor', 'doctor', 'clinic', 'organization'],
  USER_ROLES: ['user', 'doctor', 'clinic', 'organization', 'vendor'],
  USER_STATUSES: ['pending', 'approved', 'rejected'],
  PRODUCT_STATUSES: ['pending', 'approved', 'hidden', 'rejected'],
  ORDER_STATUSES: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'],
  VENDOR_ORDER_STATUSES: ['confirmed', 'processing', 'shipped', 'delivered', 'cancelled'],
  APPOINTMENT_STATUSES: ['pending', 'accepted', 'rejected', 'confirmed', 'completed', 'cancelled'],
  ACTIVE_APPOINTMENT_STATUSES: ['pending', 'accepted'],
  PROVIDER_ROLES: ['doctor', 'clinic', 'organization'],
};
