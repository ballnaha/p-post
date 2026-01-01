
import React from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
    Box,
    Avatar,
    Divider,
    Paper,
    Chip,
    alpha
} from '@mui/material';
import {
    ArrowForward as ArrowForwardIcon,
    Person as PersonIcon,
    Work as WorkIcon,
    SwapHoriz as SwapIcon,
    CompareArrows as ThreeWayIcon,
    TrendingUp as PromotionIcon,
    CheckCircle as CheckCircleIcon,
    Warning as WarningIcon,
    ArrowRightAlt as ArrowRightAltIcon
} from '@mui/icons-material';
import { Column, Personnel } from '../types';

interface LaneSummaryModalProps {
    open: boolean;
    onClose: () => void;
    column: Column | null;
    personnelMap: Record<string, Personnel>;
}

export default function LaneSummaryModal({
    open,
    onClose,
    column,
    personnelMap
}: LaneSummaryModalProps) {
    if (!column) return null;

    const vacantPos = column.vacantPosition;
    const personnelList = column.itemIds.map(id => personnelMap[id]).filter(Boolean);
    const isCompleted = column.isCompleted;

    // Determine Lane Type
    const isSwap = column.chainType === 'swap' || vacantPos?.transactionType === 'two-way';
    const isThreeWay = column.chainType === 'three-way' || vacantPos?.transactionType === 'three-way';
    const isPromotion = column.chainType === 'promotion';
    const isCustom = !vacantPos && column.chainType === 'custom';

    const getHeaderColor = () => {
        if (isSwap) return 'linear-gradient(135deg, #a855f7 0%, #9333ea 100%)';
        if (isThreeWay) return 'linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)';
        if (isPromotion) return 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)';
        return 'linear-gradient(135deg, #64748b 0%, #475569 100%)';
    };

    const getIcon = () => {
        if (isSwap) return <SwapIcon sx={{ fontSize: 24, color: 'white' }} />;
        if (isThreeWay) return <ThreeWayIcon sx={{ fontSize: 24, color: 'white' }} />;
        if (isPromotion) return <PromotionIcon sx={{ fontSize: 24, color: 'white' }} />;
        return <WorkIcon sx={{ fontSize: 24, color: 'white' }} />;
    };

    const getTargetInfo = (index: number) => {
        if (isPromotion) {
            if (index === 0) return vacantPos;
            return personnelList[index - 1]; // Previous person in chain is the target
        }
        if (isSwap && personnelList.length === 2) {
            return personnelList[index === 0 ? 1 : 0];
        }
        if (isThreeWay && personnelList.length === 3) {
            if (index === 0) return personnelList[1];
            if (index === 1) return personnelList[2];
            if (index === 2) return personnelList[0];
        }
        return null;
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="md"
            fullWidth
            PaperProps={{
                sx: { borderRadius: 3, overflow: 'hidden' }
            }}
        >
            {/* Header */}
            <Box sx={{
                background: getHeaderColor(),
                px: 3,
                py: 2,
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                color: 'white'
            }}>
                <Box sx={{ bgcolor: 'rgba(255,255,255,0.2)', p: 1, borderRadius: '50%', display: 'flex' }}>
                    {getIcon()}
                </Box>
                <Box>
                    <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                        สรุปข้อมูลในเลน (แบบละเอียด)
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                        {column.title}
                    </Typography>
                </Box>
                <Box sx={{ flex: 1 }} />
                {isCompleted ? (
                    <Chip
                        icon={<CheckCircleIcon sx={{ fill: 'white !important' }} />}
                        label="เสร็จสิ้น"
                        sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white', fontWeight: 700 }}
                    />
                ) : (
                    <Chip
                        icon={<WarningIcon sx={{ fill: 'white !important' }} />}
                        label="กำลังดำเนินการ"
                        sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white', fontWeight: 700 }}
                    />
                )}
            </Box>

            <DialogContent sx={{ p: 3, bgcolor: '#f8fafc' }}>

                {/* Main Logic: List each movement */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>

                    {/* Vacant Position Header (Only for Promotion) */}
                    {isPromotion && vacantPos && (
                        <Paper
                            elevation={0}
                            sx={{
                                p: 2,
                                border: '1px dashed',
                                borderColor: 'primary.main',
                                bgcolor: alpha('#3b82f6', 0.05),
                                borderRadius: 2,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 2
                            }}
                        >
                            <Avatar sx={{ bgcolor: 'primary.main', width: 40, height: 40 }}>
                                <WorkIcon sx={{ fontSize: 20 }} />
                            </Avatar>
                            <Box sx={{ flex: 1 }}>
                                <Typography variant="caption" sx={{ fontWeight: 700, color: 'primary.main' }}>
                                    🎯 เป้าหมายหลัก (ตำแหน่งว่าง)
                                </Typography>
                                <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                                    {vacantPos.position}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    {vacantPos.unit} | {vacantPos.posCodeMaster?.id} - {vacantPos.posCodeMaster?.name}
                                </Typography>
                            </Box>
                        </Paper>
                    )}

                    {personnelList.length > 0 ? (
                        personnelList.map((person, index) => {
                            const target = getTargetInfo(index);

                            return (
                                <Paper
                                    key={person.id}
                                    elevation={0}
                                    sx={{
                                        border: '1px solid',
                                        borderColor: 'divider',
                                        borderRadius: 2,
                                        overflow: 'hidden',
                                        position: 'relative'
                                    }}
                                >
                                    {/* Person Header */}
                                    <Box sx={{ px: 2, py: 1.5, bgcolor: '#f1f5f9', display: 'flex', alignItems: 'center', gap: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                                        <Avatar
                                            src={person.avatarUrl || undefined}
                                            sx={{ width: 32, height: 32 }}
                                        >
                                            <PersonIcon sx={{ fontSize: 20 }} />
                                        </Avatar>
                                        <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                                            {person.rank} {person.fullName}
                                        </Typography>
                                        {person.isPlaceholder && (
                                            <Chip label="Placeholder" size="small" color="warning" sx={{ height: 20, fontSize: '0.65rem', fontWeight: 700 }} />
                                        )}
                                        <Box sx={{ flex: 1 }} />
                                        <Chip label={`ลำดับที่ ${index + 1}`} size="small" variant="outlined" sx={{ height: 20, fontSize: '0.65rem' }} />
                                    </Box>

                                    {/* Comparison Body */}
                                    <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, alignItems: 'stretch' }}>
                                        {/* Old Position (Current) */}
                                        <Box sx={{ flex: { md: '0 0 45.8%' }, p: 2, bgcolor: alpha('#ef4444', 0.02) }}>
                                            <Typography variant="caption" sx={{ color: 'error.main', fontWeight: 700, display: 'block', mb: 1 }}>
                                                🔴 ตำแหน่งปัจจุบัน (เดิม)
                                            </Typography>
                                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                                    {person.position || '-'}
                                                </Typography>
                                                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                                    <b>หน่วย:</b> {person.unit || '-'}
                                                </Typography>
                                                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                                    <b>รหัส:</b> {person.posCodeMaster?.id || '-'} - {person.posCodeMaster?.name || '-'}
                                                </Typography>
                                                {person.actingAs && (
                                                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                                        <b>ทำหน้าที่:</b> {person.actingAs}
                                                    </Typography>
                                                )}
                                            </Box>
                                        </Box>

                                        {/* Arrow */}
                                        <Box sx={{ flex: { md: '0 0 8.4%' }, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.3, py: { xs: 1, md: 0 } }}>
                                            <ArrowRightAltIcon sx={{ fontSize: 32, transform: { xs: 'rotate(90deg)', md: 'none' } }} />
                                        </Box>

                                        {/* New Position (Target) */}
                                        <Box sx={{ flex: { md: '0 0 45.8%' }, p: 2, bgcolor: alpha('#22c55e', 0.02) }}>
                                            <Typography variant="caption" sx={{ color: 'success.main', fontWeight: 700, display: 'block', mb: 1 }}>
                                                🟢 ตำแหน่งใหม่ (ที่จะไป)
                                            </Typography>
                                            {target ? (
                                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                                        {target.position || '-'}
                                                    </Typography>
                                                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                                        <b>หน่วย:</b> {target.unit || '-'}
                                                    </Typography>
                                                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                                        <b>รหัส:</b> {target.posCodeMaster?.id || '-'} - {target.posCodeMaster?.name || '-'}
                                                    </Typography>
                                                    {(target as any).actingAs && (
                                                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                                            <b>ทำหน้าที่:</b> {(target as any).actingAs}
                                                        </Typography>
                                                    )}
                                                </Box>
                                            ) : (
                                                <Typography variant="body2" color="text.disabled" sx={{ fontStyle: 'italic' }}>
                                                    - ไม่ระบุ -
                                                </Typography>
                                            )}
                                        </Box>
                                    </Box>
                                </Paper>
                            );
                        })
                    ) : (
                        <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary', border: '2px dashed #e2e8f0', borderRadius: 2 }}>
                            ยังไม่มีข้อมูลบุคลากรในเลนนี้
                        </Box>
                    )}
                </Box>

                {/* 3. Summary Footer */}
                {personnelList.length > 0 && vacantPos && isPromotion && (
                    <Box sx={{ mt: 3, p: 2, bgcolor: alpha('#22c55e', 0.1), borderRadius: 2, border: '1px solid', borderColor: alpha('#22c55e', 0.2) }}>
                        <Typography variant="subtitle2" sx={{ color: '#15803d', fontWeight: 700, mb: 0.5 }}>
                            สรุปภาพรวม
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#166534' }}>
                            มีการแทนที่ตำแหน่งต่อเนื่องทั้งหมด <b>{personnelList.length}</b> ลำดับ เริ่มต้นจากตำแหน่ง <b>{vacantPos.position}</b>
                        </Typography>
                    </Box>
                )}

            </DialogContent>
            <DialogActions sx={{ p: 2, bgcolor: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
                <Button onClick={onClose} variant="contained" sx={{ borderRadius: 2, px: 3, fontWeight: 700, textTransform: 'none' }}>
                    ปิดหน้าต่าง
                </Button>
            </DialogActions>
        </Dialog>
    );
}
