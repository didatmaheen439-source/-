import { useAccess } from '@umijs/max';
import type { ButtonProps } from 'antd';
import { Button } from 'antd';
import type React from 'react';
import type {
  AdminModuleKey,
  PermissionAction,
} from '@/foundation/permissions';
import { actionLabels } from '@/foundation/permissions';

type PermissionButtonProps = ButtonProps & {
  moduleKey: AdminModuleKey;
  action: PermissionAction;
};

const PermissionButton: React.FC<PermissionButtonProps> = ({
  moduleKey,
  action,
  children,
  ...buttonProps
}) => {
  const access = useAccess() as {
    canAction?: (
      targetModule: AdminModuleKey,
      targetAction: PermissionAction,
    ) => boolean;
  };

  if (!access.canAction?.(moduleKey, action)) {
    return null;
  }

  return <Button {...buttonProps}>{children ?? actionLabels[action]}</Button>;
};

export default PermissionButton;
