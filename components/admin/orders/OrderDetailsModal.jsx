"use client";

import React from "react";
import { FaTimes, FaUser, FaMapMarkerAlt, FaBox, FaRupeeSign, FaCalendarAlt, FaPhone, FaEnvelope } from "react-icons/fa";
import moment from "moment";

const OrderDetailsModal = ({ isOpen, onClose, order, onStatusUpdate }) => {
  if (!isOpen || !order) return null;

  const handleStatusChange = (newStatus) => {
    if (onStatusUpdate) {
      onStatusUpdate(order.id, newStatus);
    }
  };

  const getStatusBadge = (status) => {
    const statusStyles = {
      'pending': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'inProcess': 'bg-blue-100 text-blue-800 border-blue-200',
      'delivered': 'bg-green-100 text-green-800 border-green-200'
    };
    
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-semibold border ${statusStyles[status] || 'bg-gray-100 text-gray-800 border-gray-200'}`}>
        {status?.charAt(0).toUpperCase() + status?.slice(1)}
      </span>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Order Details #{order.id}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Placed on {moment(order.createdAt).format('DD MMM YYYY, hh:mm A')}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <FaTimes size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Order Status and Actions */}
          <div className="flex flex-wrap items-center justify-between gap-4 bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Status:</span>
              {getStatusBadge(order.status)}
            </div>
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Update Status:
              </label>
              <select
                value={order.status}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              >
                <option value="pending">Pending</option>
                <option value="inProcess">In Process</option>
                <option value="delivered">Delivered</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Customer Information */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                <FaUser className="mr-2" />
                Customer Information
              </h3>
              <div className="space-y-3">
                <div>
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Name:</span>
                  <p className="text-gray-900 dark:text-gray-100 font-medium">
                    {order.user?.fullName || 'N/A'}
                  </p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center">
                    <FaEnvelope className="mr-1" size={12} />
                    Email:
                  </span>
                  <p className="text-gray-900 dark:text-gray-100">
                    {order.user?.email || 'N/A'}
                  </p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center">
                    <FaPhone className="mr-1" size={12} />
                    Mobile:
                  </span>
                  <p className="text-gray-900 dark:text-gray-100">
                    {order.user?.mobileNo || 'N/A'}
                  </p>
                </div>
              </div>
            </div>

            {/* Order Summary */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                <FaRupeeSign className="mr-2" />
                Order Summary
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Subtotal:</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    ₹{((order.total || 0) - (order.deliveryCharges || 0) - (order.gstAmount || 0)).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Delivery Charges:</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    ₹{(order.deliveryCharges || 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">GST:</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    ₹{(order.gstAmount || 0).toFixed(2)}
                  </span>
                </div>
                <div className="border-t border-gray-300 dark:border-gray-600 pt-3">
                  <div className="flex justify-between">
                    <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">Total:</span>
                    <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                      ₹{(order.total || 0).toFixed(2)}
                    </span>
                  </div>
                </div>
                {order.paymentId && (
                  <div className="mt-3 pt-3 border-t border-gray-300 dark:border-gray-600">
                    <div className="text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Payment ID:</span>
                      <p className="font-mono text-xs text-gray-900 dark:text-gray-100 bg-gray-200 dark:bg-gray-600 p-2 rounded mt-1">
                        {order.paymentId}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Delivery Address */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
              <FaMapMarkerAlt className="mr-2" />
              Delivery Address
            </h3>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
              <p className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
                {order.address || 'No address provided'}
              </p>
            </div>
          </div>

          {/* Order Items */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
              <FaBox className="mr-2" />
              Order Items ({order.orderProducts?.length || 0})
            </h3>
            <div className="space-y-4">
              {order.orderProducts?.map((product, index) => (
                <div
                  key={product.id || index}
                  className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-600"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
                        {product.title}
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Quantity:</span>
                          <p className="font-medium text-gray-900 dark:text-gray-100">{product.quantity}</p>
                        </div>
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Unit Price:</span>
                          <p className="font-medium text-gray-900 dark:text-gray-100">₹{(product.sellingPrice || 0).toFixed(2)}</p>
                        </div>
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Discount:</span>
                          <p className="font-medium text-green-600">-₹{(product.discount || 0).toFixed(2)}</p>
                        </div>
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Total:</span>
                          <p className="font-bold text-blue-600 dark:text-blue-400">₹{(product.totalPrice || 0).toFixed(2)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )) || (
                <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                  No items found for this order
                </p>
              )}
            </div>
          </div>

          {/* Order Timeline */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
              <FaCalendarAlt className="mr-2" />
              Order Timeline
            </h3>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">Order Placed</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {moment(order.createdAt).format('DD MMM YYYY, hh:mm A')}
                  </p>
                </div>
              </div>
              {order.paidAt && (
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-gray-100">Payment Confirmed</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {moment(order.paidAt).format('DD MMM YYYY, hh:mm A')}
                    </p>
                  </div>
                </div>
              )}
              {order.deliveredAt && (
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-gray-100">Order Delivered</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {moment(order.deliveredAt).format('DD MMM YYYY, hh:mm A')}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Additional Notes */}
          {order.orderNotice && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-6 border border-yellow-200 dark:border-yellow-800">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Order Notes
              </h3>
              <p className="text-gray-700 dark:text-gray-300">
                {order.orderNotice}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-700 px-6 py-4 border-t border-gray-200 dark:border-gray-600">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetailsModal;