import React from 'react';
import { JobAd, User } from '../types/job';
import { PostJobPage } from './PostJobPage';

interface PostJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJobCreated: (newJob: JobAd) => void;
  onJobUpdated?: (updatedJob: JobAd) => void;
  editingJob?: JobAd | null;
  currentUser: User | null;
}

export const PostJobModal: React.FC<PostJobModalProps> = ({
  isOpen,
  onClose,
  onJobCreated,
  onJobUpdated,
  editingJob,
  currentUser
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-50 overflow-y-auto">
      <PostJobPage
        currentUser={currentUser}
        editingJob={editingJob}
        onJobCreated={onJobCreated}
        onJobUpdated={onJobUpdated}
        onViewJob={() => onClose()}
        onManageJobs={onClose}
        onCancel={onClose}
      />
    </div>
  );
};
