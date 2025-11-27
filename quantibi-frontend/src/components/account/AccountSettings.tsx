import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import apiService from '../../services/api';

interface UserUsage {
  uploads: number;
  charts: number;
  reports: number;
  workspaces: number;
  dashboards: number;
}

interface UserData {
  usage: UserUsage;
  plan: 'free' | 'pro';
  remaining: {
    uploads: number;
    charts: number;
    reports: number;
    workspaces: number;
    dashboards: number;
  };
  subscriptionId?: string;
}

const AccountSettings: React.FC = () => {
  const { currentUser } = useAuth();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelingSubscription, setCancelingSubscription] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const response = await apiService.getUserUsage();
      setUserData(response);
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    setCancelingSubscription(true);
    try {
      await apiService.cancelSubscription();
      alert('Your subscription has been canceled. You will retain Pro access until the end of your billing period.');
      await fetchUserData(); // Refresh data
      setShowCancelConfirm(false);
    } catch (error: any) {
      console.error('Error canceling subscription:', error);
      alert(error.response?.data?.message || 'Failed to cancel subscription. Please try again or contact support.');
    } finally {
      setCancelingSubscription(false);
    }
  };

  const handleUpgrade = async () => {
    try {
      const priceId = process.env.REACT_APP_STRIPE_PRICE_ID;
      const response = await apiService.createCheckoutSession(priceId || '');
      if (response.url) {
        window.location.href = response.url;
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
      alert('Failed to start upgrade process. Please try again.');
    }
  };

  const planFeatures = {
    free: [
      '1 workspace',
      '5 charts per month',
      '1 report per month',
      '10 file uploads per month',
      '5 dashboards',
      'Community support'
    ],
    pro: [
      'Unlimited workspaces',
      'Unlimited charts',
      'Unlimited reports',
      'Unlimited file uploads',
      'Unlimited dashboards',
      'Priority support',
      'Advanced analytics',
      'Custom branding'
    ]
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          <span className="ml-2 text-gray-600">Loading account settings...</span>
        </div>
      </div>
    );
  }

  const isPro = userData?.plan === 'pro';

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Account Settings</h1>
        <p className="text-gray-600">Manage your account and subscription</p>
      </div>

      {/* Account Information */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Account Information</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={currentUser?.email || ''}
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-900 cursor-not-allowed"
            />
            <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">User ID</label>
            <input
              type="text"
              value={currentUser?.uid || ''}
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500 text-sm font-mono cursor-not-allowed"
            />
          </div>
        </div>
      </div>

      {/* Subscription Plan */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Current Plan</h2>
            <p className="text-gray-600">Your current subscription plan and usage</p>
          </div>
          <div className="flex items-center">
            <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold ${
              isPro 
                ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white' 
                : 'bg-gray-100 text-gray-800'
            }`}>
              {isPro ? '✨ Pro Plan' : 'Free Plan'}
            </span>
          </div>
        </div>

        {/* Usage Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Charts Created</p>
                <p className="text-2xl font-bold text-gray-900">
                  {userData?.usage?.charts || 0}
                  {!isPro && <span className="text-sm font-normal text-gray-500"> / 5</span>}
                </p>
              </div>
              <svg className="w-8 h-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            {!isPro && userData?.remaining && userData.remaining.charts <= 2 && (
              <p className="text-xs text-orange-600 mt-2">⚠️ Only {userData.remaining.charts} remaining this month</p>
            )}
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Reports Generated</p>
                <p className="text-2xl font-bold text-gray-900">
                  {userData?.usage?.reports || 0}
                  {!isPro && <span className="text-sm font-normal text-gray-500"> / 1</span>}
                </p>
              </div>
              <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            {!isPro && userData?.remaining && userData.remaining.reports === 0 && (
              <p className="text-xs text-red-600 mt-2">🚫 Limit reached this month</p>
            )}
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Workspaces</p>
                <p className="text-2xl font-bold text-gray-900">
                  {userData?.usage?.workspaces || 0}
                  {!isPro && <span className="text-sm font-normal text-gray-500"> / 1</span>}
                </p>
              </div>
              <svg className="w-8 h-8 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
          </div>
        </div>

        {/* Plan Features */}
        <div className="border-t border-gray-200 pt-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Plan Features</h3>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {planFeatures[isPro ? 'pro' : 'free'].map((feature, index) => (
              <li key={index} className="flex items-center text-sm text-gray-700">
                <svg className={`w-5 h-5 mr-2 ${isPro ? 'text-green-500' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {feature}
              </li>
            ))}
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="border-t border-gray-200 pt-4 mt-4">
          {!isPro ? (
            <button
              onClick={handleUpgrade}
              className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-purple-600 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              ✨ Upgrade to Pro - $29/month
            </button>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
                <div>
                  <p className="text-sm font-semibold text-green-900">Active Subscription</p>
                  <p className="text-xs text-green-700">You have unlimited access to all Pro features</p>
                </div>
                <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              {userData?.subscriptionId && (
                <button
                  onClick={() => setShowCancelConfirm(true)}
                  className="w-full px-6 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition-colors"
                >
                  Cancel Subscription
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-white rounded-lg border border-red-200 p-6">
        <h2 className="text-xl font-semibold text-red-900 mb-4">Danger Zone</h2>
        <div className="flex items-center justify-between p-4 bg-red-50 border border-red-200 rounded-lg">
          <div>
            <p className="text-sm font-medium text-red-900">Delete Account</p>
            <p className="text-sm text-red-600">Permanently delete your account and all associated data</p>
          </div>
          <button 
            onClick={() => alert('Account deletion functionality coming soon. Please contact support to delete your account.')}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            Delete Account
          </button>
        </div>
      </div>

      {/* Cancel Confirmation Modal */}
      {showCancelConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Cancel Subscription?</h3>
            <p className="text-sm text-gray-600 mb-4">
              Are you sure you want to cancel your Pro subscription? You will retain Pro access until the end of your current billing period, after which you'll be downgraded to the Free plan.
            </p>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
              <p className="text-xs text-yellow-800">
                <strong>What happens after cancellation:</strong>
              </p>
              <ul className="text-xs text-yellow-700 list-disc list-inside mt-2">
                <li>Access to Pro features until billing period ends</li>
                <li>Downgrade to Free plan limits</li>
                <li>Data remains intact</li>
                <li>Can resubscribe anytime</li>
              </ul>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowCancelConfirm(false)}
                disabled={cancelingSubscription}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50"
              >
                Keep Subscription
              </button>
              <button
                onClick={handleCancelSubscription}
                disabled={cancelingSubscription}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                {cancelingSubscription ? 'Canceling...' : 'Cancel Subscription'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountSettings;
