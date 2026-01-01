'use client';

import React, { memo } from 'react';
import { IconButton, Tooltip } from '@mui/material';
import { PersonAddAlt as PersonAddAltIcon } from '@mui/icons-material';

interface AddPlaceholderCardButtonProps {
    onAdd: () => void;
    disabled?: boolean;
}

/**
 * Button to add a placeholder/empty card to a lane
 * Used when the actual person for the position is not yet determined
 */
const AddPlaceholderCardButton = memo(({
    onAdd,
    disabled = false
}: AddPlaceholderCardButtonProps) => {
    return (
        <Tooltip title="เพิ่มช่องว่าง (ยังไม่ระบุตัวบุคคล)" arrow>
            <span>
                <IconButton
                    size="small"
                    onClick={(e) => {
                        e.stopPropagation();
                        onAdd();
                    }}
                    disabled={disabled}
                    sx={{
                        color: 'text.secondary',
                        bgcolor: 'grey.100',
                        '&:hover': {
                            color: 'primary.main',
                            bgcolor: 'primary.50',
                        },
                        '&.Mui-disabled': {
                            bgcolor: 'grey.50',
                        }
                    }}
                >
                    <PersonAddAltIcon sx={{ fontSize: 18 }} />
                </IconButton>
            </span>
        </Tooltip>
    );
});

AddPlaceholderCardButton.displayName = 'AddPlaceholderCardButton';

export default AddPlaceholderCardButton;
