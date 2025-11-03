'use client';
import React, { useState, useEffect } from 'react';
import {
  Drawer,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  InputAdornment,
  Box,
  Typography,
  Chip,
  CircularProgress,
  Alert,
  alpha,
  Paper,
  IconButton,
  Tooltip,
  Divider,
  Badge,
} from '@mui/material';
import {
  Search as SearchIcon,
  Close as CloseIcon,
  Info as InfoIcon,
  FilterList as FilterListIcon,
} from '@mui/icons-material';

interface SwapListPerson {
  id: string;
  posCodeId: number;
  position: string;
  unit: string;
  fullName: string;
  rank: string;
  nationalId: string;
  seniority?: string;
  rankLevel: number;
  positionNumber?: string;
}

interface VacantPosition {
  id: string;
  posCodeId: number;
  position: string;
  unit: string;
}

interface CandidateSelectorProps {
  open: boolean;
  onClose: () => void;
  targetRankLevel: number; // ระดับของตำแหน่งว่างที่ต้องการหาคนมาแทน
  onSelect: (candidate: SwapListPerson) => void;
  vacantPosition: VacantPosition | null;
}

const RANK_HIERARCHY = [
  { rankName: 'รอง ผบ.ตร.', rankLevel: 1 },
  { rankName: 'ผู้ช่วย', rankLevel: 2 },
  { rankName: 'ผบช.', rankLevel: 3 },
  { rankName: 'รอง ผบช.', rankLevel: 4 },
  { rankName: 'ผบก.', rankLevel: 6 },
  { rankName: 'รอง ผบก.', rankLevel: 7 },
  { rankName: 'ผกก.', rankLevel: 8 },
  { rankName: 'รอง ผกก.', rankLevel: 9 },
  { rankName: 'สว.', rankLevel: 11 },
  { rankName: 'รอง สว.', rankLevel: 12 },
];

export default function CandidateSelector({
  open,
  onClose,
  targetRankLevel,
  onSelect,
  vacantPosition,
}: CandidateSelectorProps) {
  const [loading, setLoading] = useState(false);
  const [candidates, setCandidates] = useState<SwapListPerson[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCandidate, setSelectedCandidate] = useState<SwapListPerson | null>(null);

  useEffect(() => {
    if (open) {
      loadCandidates();
    }
  }, [open, targetRankLevel]);

  const loadCandidates = async () => {
    setLoading(true);
    try {
      // TODO: Implement API call to get swap list
      // const response = await fetch(`/api/swap-list?year=2568`);
      // const data = await response.json();
      // const filtered = data.filter(p => p.rankLevel > targetRankLevel);
      // setCandidates(filtered);

      // Mock data for demonstration - ข้อมูลทุกระดับยศ
      const allMockData: SwapListPerson[] = [
        // รอง ผบก. (Level 7)
        {
          id: 'sl-1',
          posCodeId: 7,
          position: 'รอง ผบก.-ราชบุรี',
          unit: 'สถ.ราชบุรี',
          fullName: 'พ.ต.ท. สมชาย ใจดี',
          rank: 'พ.ต.ท.',
          nationalId: '1234567890123',
          seniority: 'อ.50',
          rankLevel: 7,
          positionNumber: 'P-701',
        },
        {
          id: 'sl-2',
          posCodeId: 7,
          position: 'รอง ผบก.-กาญจนบุรี',
          unit: 'สถ.กาญจนบุรี',
          fullName: 'พ.ต.ท. สมศรี รักษ์ดี',
          rank: 'พ.ต.ท.',
          nationalId: '1234567890124',
          seniority: 'อ.51',
          rankLevel: 7,
          positionNumber: 'P-702',
        },
        // ผกก. (Level 8)
        {
          id: 'sl-3',
          posCodeId: 8,
          position: 'ผกก.-สมุทรสาคร',
          unit: 'สถ.สมุทรสาคร',
          fullName: 'พ.ต.ท. สมหมาย มั่นคง',
          rank: 'พ.ต.ท.',
          nationalId: '1234567890125',
          seniority: 'อ.52',
          rankLevel: 8,
          positionNumber: 'P-801',
        },
        {
          id: 'sl-4',
          posCodeId: 8,
          position: 'ผกก.-สุพรรณบุรี',
          unit: 'สถ.สุพรรณบุรี',
          fullName: 'พ.ต.ต. สมพร เจริญดี',
          rank: 'พ.ต.ต.',
          nationalId: '1234567890126',
          seniority: 'อ.53',
          rankLevel: 8,
          positionNumber: 'P-802',
        },
        // รอง ผกก. (Level 9)
        {
          id: 'sl-9',
          posCodeId: 9,
          position: 'รอง ผกก.-เพชรบุรี',
          unit: 'สถ.เพชรบุรี',
          fullName: 'พ.ต.ต. สมปอง วีรชน',
          rank: 'พ.ต.ต.',
          nationalId: '1234567890131',
          seniority: 'อ.58',
          rankLevel: 9,
          positionNumber: 'P-901',
        },
        {
          id: 'sl-10',
          posCodeId: 9,
          position: 'รอง ผกก.-ประจวบคีรีขันธ์',
          unit: 'สถ.ประจวบคีรีขันธ์',
          fullName: 'พ.ต.ต. สมคิด แกล้วกล้า',
          rank: 'พ.ต.ต.',
          nationalId: '1234567890132',
          seniority: 'อ.59',
          rankLevel: 9,
          positionNumber: 'P-902',
        },
        // สว. (Level 11)
        {
          id: 'sl-5',
          posCodeId: 11,
          position: 'สว.-กาญจนบุรี',
          unit: 'สถ.กาญจนบุรี',
          fullName: 'พ.ต.ต. สมใจ ซื่อสัตย์',
          rank: 'พ.ต.ต.',
          nationalId: '1234567890127',
          seniority: 'อ.54',
          rankLevel: 11,
          positionNumber: 'P-1101',
        },
        {
          id: 'sl-6',
          posCodeId: 11,
          position: 'สว.-เพชรบุรี',
          unit: 'สถ.เพชรบุรี',
          fullName: 'พ.ต.ต. สมบูรณ์ ยุติธรรม',
          rank: 'พ.ต.ต.',
          nationalId: '1234567890128',
          seniority: 'อ.55',
          rankLevel: 11,
          positionNumber: 'P-1102',
        },
        // รอง สว. (Level 12)
        {
          id: 'sl-7',
          posCodeId: 12,
          position: 'รอง สว.-สุพรรณบุรี',
          unit: 'สถ.สุพรรณบุรี',
          fullName: 'ร.ต.อ. สมศักดิ์ กล้าหาญ',
          rank: 'ร.ต.อ.',
          nationalId: '1234567890129',
          seniority: 'อ.56',
          rankLevel: 12,
          positionNumber: 'P-1201',
        },
        {
          id: 'sl-8',
          posCodeId: 12,
          position: 'รอง สว.-ราชบุรี',
          unit: 'สถ.ราชบุรี',
          fullName: 'ร.ต.อ. สมนึก อุทิศ',
          rank: 'ร.ต.อ.',
          nationalId: '1234567890130',
          seniority: 'อ.57',
          rankLevel: 12,
          positionNumber: 'P-1202',
        },
      ];

      // Filter: แสดงเฉพาะคนที่มียศต่ำกว่าตำแหน่งว่าง (rankLevel > targetRankLevel)
      // เพราะ rankLevel น้อย = ยศสูง, rankLevel มาก = ยศต่ำ
      const filteredData = allMockData.filter(p => p.rankLevel > targetRankLevel);
      setCandidates(filteredData);
    } catch (error) {
      console.error('Error loading candidates:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRankName = (level: number): string => {
    const rank = RANK_HIERARCHY.find((r) => r.rankLevel === level);
    return rank?.rankName || `ระดับ ${level}`;
  };

  const filteredCandidates = candidates.filter((c) =>
    c.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.position.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.unit.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelect = () => {
    if (selectedCandidate) {
      onSelect(selectedCandidate);
      setSelectedCandidate(null);
      setSearchTerm('');
    }
  };

  const handleClose = () => {
    setSelectedCandidate(null);
    setSearchTerm('');
    onClose();
  };

  // Double-click to select
  const handleDoubleClick = (candidate: SwapListPerson) => {
    setSelectedCandidate(candidate);
    setTimeout(() => {
      onSelect(candidate);
      setSelectedCandidate(null);
      setSearchTerm('');
    }, 100);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!open) return;
      
      if (e.key === 'Enter' && selectedCandidate) {
        handleSelect();
      } else if (e.key === 'Escape') {
        handleClose();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [open, selectedCandidate]);

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={handleClose}
      PaperProps={{
        sx: { 
          width: { xs: '100%', sm: '90%', md: 700 },
          backgroundImage: 'none',
        }
      }}
      SlideProps={{
        timeout: { enter: 300, exit: 250 }
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Header */}
        <Box sx={{ 
          p: 2, 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          borderBottom: 1,
          borderColor: 'divider',
          bgcolor: 'background.paper',
          position: 'sticky',
          top: 0,
          zIndex: 1,
        }}>
          <Box>
            <Typography variant="h6" gutterBottom>
              เลือกผู้สมัคร
            </Typography>
            <Typography variant="caption" color="text.secondary">
              เลือกบุคลากรที่ต้องการเลื่อนขึ้นมาแทนตำแหน่งว่าง • Double-click เพื่อเลือกเลย
            </Typography>
          </Box>
          <IconButton onClick={handleClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>

        {/* Content */}
        <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
        {/* Info Card */}
        <Paper 
          elevation={0} 
          sx={{ 
            p: 2, 
            mb: 2, 
            bgcolor: alpha('#2196f3', 0.08),
            border: '1px solid',
            borderColor: alpha('#2196f3', 0.3),
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 1 }}>
            <InfoIcon color="primary" sx={{ fontSize: 20, mt: 0.5 }} />
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle2" color="primary" gutterBottom>
                ข้อมูลตำแหน่งว่าง
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                <Typography variant="body2">
                  <strong>ตำแหน่ง:</strong> {vacantPosition?.position}
                </Typography>
                <Typography variant="body2">
                  <strong>หน่วย:</strong> {vacantPosition?.unit}
                </Typography>
                <Typography variant="body2">
                  <strong>ระดับ:</strong> {getRankName(targetRankLevel)} (Level {targetRankLevel})
                </Typography>
              </Box>
            </Box>
          </Box>
          <Divider sx={{ my: 1 }} />
          <Typography variant="caption" color="text.secondary">
            💡 แสดงเฉพาะผู้สมัครที่มียศต่ำกว่า (Level {'>'} {targetRankLevel}) เพื่อเลื่อนขึ้นมา
          </Typography>
        </Paper>

        {/* Search Bar */}
        <Box sx={{ mb: 2 }}>
          <TextField
            fullWidth
            placeholder="ค้นหา: ชื่อ-นามสกุล, ตำแหน่ง, หน่วย, ยศ..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            size="medium"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="action" />
                </InputAdornment>
              ),
              endAdornment: searchTerm && (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setSearchTerm('')}>
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          {filteredCandidates.length > 0 && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              พบ <strong>{filteredCandidates.length}</strong> รายการจาก <strong>{candidates.length}</strong> คน
            </Typography>
          )}
        </Box>

        {/* Candidates List */}
        {loading ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', p: 5 }}>
            <CircularProgress size={40} />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              กำลังโหลดรายชื่อผู้สมัคร...
            </Typography>
          </Box>
        ) : filteredCandidates.length === 0 ? (
          <Alert severity="warning" icon={<InfoIcon />}>
            {searchTerm ? (
              <>ไม่พบผู้สมัครที่ตรงกับคำค้นหา "<strong>{searchTerm}</strong>"</>
            ) : (
              <>ไม่พบผู้สมัครที่มียศต่ำกว่า <strong>{getRankName(targetRankLevel)}</strong> (Level {'>'} {targetRankLevel}) ใน Swap List</>
            )}
          </Alert>
        ) : (
          <Box>
            {filteredCandidates.map((candidate, index) => (
              <Paper
                key={candidate.id}
                elevation={0}
                sx={{
                  p: 2,
                  mb: 1.5,
                  cursor: 'pointer',
                  border: '2px solid',
                  borderColor: selectedCandidate?.id === candidate.id 
                    ? 'primary.main' 
                    : 'divider',
                  bgcolor: selectedCandidate?.id === candidate.id 
                    ? alpha('#2196f3', 0.08) 
                    : 'background.paper',
                  transition: 'all 0.2s',
                  '&:hover': {
                    borderColor: 'primary.main',
                    bgcolor: alpha('#2196f3', 0.04),
                    transform: 'translateX(4px)',
                    boxShadow: 2,
                  },
                }}
                onClick={() => setSelectedCandidate(candidate)}
                onDoubleClick={() => handleDoubleClick(candidate)}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box sx={{ flex: 1 }}>
                    {/* Name and Rank */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <Typography variant="subtitle1" fontWeight="bold">
                        {candidate.fullName}
                      </Typography>
                      <Chip 
                        label={candidate.rank} 
                        size="small" 
                        color="primary"
                        variant={selectedCandidate?.id === candidate.id ? 'filled' : 'outlined'}
                      />
                      {candidate.seniority && (
                        <Chip 
                          label={candidate.seniority} 
                          size="small" 
                          variant="outlined"
                        />
                      )}
                    </Box>

                    {/* Position Info */}
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                      <Typography variant="body2" color="text.secondary">
                        <strong>ตำแหน่งปัจจุบัน:</strong> {candidate.position}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        <strong>หน่วย:</strong> {candidate.unit}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        <strong>เลขบัตร:</strong> {candidate.nationalId}
                      </Typography>
                    </Box>
                  </Box>

                  {/* Select Button */}
                  <Button
                    variant={selectedCandidate?.id === candidate.id ? 'contained' : 'outlined'}
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedCandidate(candidate);
                    }}
                    sx={{ minWidth: 80 }}
                  >
                    {selectedCandidate?.id === candidate.id ? '✓ เลือกแล้ว' : 'เลือก'}
                  </Button>
                </Box>
              </Paper>
            ))}
          </Box>
        )}

        {/* Selected Summary */}
        {selectedCandidate && (
          <Paper 
            elevation={0}
            sx={{ 
              mt: 2, 
              p: 2.5, 
              bgcolor: alpha('#4caf50', 0.08), 
              border: '2px solid', 
              borderColor: 'success.main',
              borderRadius: 2,
            }}
          >
            <Typography variant="subtitle2" color="success.main" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              ✓ ผู้สมัครที่เลือก
            </Typography>
            <Divider sx={{ my: 1 }} />
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Typography variant="body2">
                <strong>ชื่อ:</strong> {selectedCandidate.fullName} ({selectedCandidate.rank})
              </Typography>
              <Typography variant="body2">
                <strong>จากตำแหน่ง:</strong> {selectedCandidate.position}
              </Typography>
              <Typography variant="body2">
                <strong>หน่วย:</strong> {selectedCandidate.unit}
              </Typography>
              <Box sx={{ 
                mt: 1, 
                p: 1.5, 
                bgcolor: alpha('#4caf50', 0.15), 
                borderRadius: 1,
                display: 'flex',
                alignItems: 'center',
                gap: 1,
              }}>
                <Typography variant="body2" sx={{ flex: 1 }}>
                  <strong>→ เลื่อนไปเป็น:</strong> {vacantPosition?.position}
                </Typography>
              </Box>
            </Box>
          </Paper>
        )}
        </Box>

        {/* Footer Actions */}
        <Box sx={{ 
          p: 2.5, 
          borderTop: 1, 
          borderColor: 'divider',
          bgcolor: 'background.paper',
          display: 'flex',
          gap: 2,
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 -4px 6px rgba(0,0,0,0.05)',
        }}>
          <Box sx={{ flex: 1 }}>
            {selectedCandidate ? (
              <Box>
                <Typography variant="body2" fontWeight="bold" color="success.main">
                  ✓ เลือก: {selectedCandidate.fullName}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {selectedCandidate.rank} • {selectedCandidate.unit}
                </Typography>
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary">
                กรุณาเลือกผู้สมัคร 1 คน
              </Typography>
            )}
          </Box>
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <Button 
              onClick={handleClose} 
              variant="outlined"
              size="large"
            >
              ยกเลิก
            </Button>
            <Button
              variant="contained"
              onClick={handleSelect}
              disabled={!selectedCandidate}
              size="large"
              sx={{ minWidth: 140 }}
            >
              {selectedCandidate ? '✓ ยืนยันการเลือก' : 'ยืนยันการเลือก'}
            </Button>
          </Box>
        </Box>
      </Box>
    </Drawer>
  );
}
