'use client';
import React, { useState, useEffect } from 'react';
import { Drawer, Button, TextField, InputAdornment, Box, Typography, CircularProgress, Paper, IconButton, Divider, FormControl, Select, MenuItem, SelectChangeEvent } from '@mui/material';
import { Search as SearchIcon, Close as CloseIcon, FilterList as FilterListIcon } from '@mui/icons-material';
import DataTablePagination from '@/components/DataTablePagination';

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
  const [filterUnit, setFilterUnit] = useState<string>('all');
  
  // Pagination states
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  useEffect(() => {
    if (open) {
      loadCandidates();
      // Set default filter to vacant position's unit
      if (vacantPosition?.unit) {
        setFilterUnit(vacantPosition.unit);
      } else {
        setFilterUnit('all');
      }
    }
  }, [open, targetRankLevel, vacantPosition?.unit]);

  const loadCandidates = async () => {
    setLoading(true);
    try {
      console.log('=== Loading Candidates ===');
      console.log('Target Vacant Position:', {
        id: vacantPosition?.id,
        posCodeId: vacantPosition?.posCodeId,
        position: vacantPosition?.position,
        unit: vacantPosition?.unit,
        targetRankLevel: targetRankLevel
      });
      
      // Fetch from police-personnel API with large limit to get all personnel
      const response = await fetch('/api/police-personnel?limit=10000');

      if (!response.ok) {
        throw new Error('Failed to fetch police personnel');
      }

      const result = await response.json();
      const allData: any[] = Array.isArray(result?.data) ? result.data : [];

      console.log('Police Personnel API Response:', { 
        total: allData.length,
        sample: allData.slice(0, 2),
        firstPersonWithPosCodeId: allData.find(p => p.posCodeId)
      });

      // Map API data to SwapListPerson format and filter
      const mappedData: SwapListPerson[] = allData
        .filter((p: any) => {
          // ต้องมี posCodeId และ posCodeMaster
          if (!p.posCodeId || !p.posCodeMaster) {
            console.log('❌ Filtered out (no posCodeId/posCodeMaster):', p.id, p.fullName);
            return false;
          }
          
          // ต้องมีคนครองตำแหน่ง (มี rank และ fullName ที่ไม่ใช่ "ว่าง")
          if (!p.rank || !p.fullName) {
            console.log('❌ Filtered out (no rank/fullName):', p.id);
            return false;
          }
          if (p.fullName.includes('ว่าง')) {
            console.log('❌ Filtered out (vacant):', p.id, p.fullName);
            return false;
          }
          
          // ยกเว้นตำแหน่งว่างที่กำลังสร้าง chain
          if (vacantPosition?.id && p.id === vacantPosition.id) {
            console.log('❌ Filtered out (same as vacant position):', p.id, p.fullName);
            return false;
          }
          
          // กรองเฉพาะที่มียศต่ำกว่าตำแหน่งว่าง เพื่อให้สามารถเลื่อนขึ้นได้
          // ใช้ posCodeId จาก pos_code_master เป็นตัวกำหนดระดับ (posCodeId น้อย = ยศสูง)
          // ตัวอย่าง: ผบก. (posCodeId=6) สามารถเลื่อนเป็น ผบช. (posCodeId=3) ได้
          const personnelPosCodeId = p.posCodeId;
          if (personnelPosCodeId >= targetRankLevel) {
            console.log(`❌ Filtered out (rank not promotable): ${p.fullName} - posCodeId ${personnelPosCodeId} >= target ${targetRankLevel}`);
            return false;
          }
          
          console.log(`✅ Passed filter: ${p.fullName} - posCodeId ${personnelPosCodeId} < target ${targetRankLevel} (can promote)`);
          return true;
        })
        .map((p: any) => {
          // ดึงชื่อตำแหน่งจาก posCodeMaster (ความสัมพันธ์กับ PosCodeMaster table)
          const positionName = p.posCodeMaster?.name || p.position || '-';
          
          return {
            id: p.id,
            posCodeId: p.posCodeId, // posCodeId จาก pos_code_master
            position: positionName, // ชื่อตำแหน่งจาก PosCodeMaster.name
            unit: p.unit || '-',
            fullName: p.fullName || '-',
            rank: p.rank || '-',
            nationalId: p.nationalId || '',
            seniority: p.seniority || '',
            rankLevel: p.posCodeId, // ใช้ posCodeId เป็นตัวบ่งบอกระดับ (เก็บไว้เพื่อ backward compatibility)
            positionNumber: p.positionNumber || '',
          };
        })
        .sort((a, b) => {
          // Sort: หน่วยเดียวกันกับตำแหน่งว่างขึ้นก่อน
          const vacantUnit = vacantPosition?.unit || '';
          const aIsSameUnit = a.unit === vacantUnit;
          const bIsSameUnit = b.unit === vacantUnit;
          
          if (aIsSameUnit && !bIsSameUnit) return -1;
          if (!aIsSameUnit && bIsSameUnit) return 1;
          
          // ถ้าหน่วยเดียวกัน หรือต่างหน่วยทั้งคู่ ให้เรียงตาม posCodeId (ยศสูงขึ้นก่อน)
          // posCodeId น้อย = ยศสูง (เช่น posCodeId 3 = ผบช., posCodeId 11 = สว.)
          if (a.posCodeId !== b.posCodeId) {
            return a.posCodeId - b.posCodeId; // เรียงจากน้อยไปมาก = ยศสูงไปต่ำ
          }
          
          // ถ้า posCodeId เท่ากัน เรียงตามชื่อ
          return a.fullName.localeCompare(b.fullName, 'th');
        });

      console.log('Filtered & Sorted Candidates:', {
        total: mappedData.length,
        targetRankLevel,
        vacantUnit: vacantPosition?.unit,
        sameUnitCount: mappedData.filter(c => c.unit === vacantPosition?.unit).length,
        sample: mappedData.slice(0, 2)
      });

      setCandidates(mappedData);
    } catch (error) {
      console.error('Error loading candidates:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRankName = (posCodeId: number): string => {
    // ใช้ข้อมูลจาก vacantPosition.position ถ้ามี posCodeId ตรงกัน
    if (vacantPosition?.posCodeId === posCodeId) {
      return vacantPosition.position;
    }
    // ถ้าไม่ตรง ให้ค้นหาจาก candidates
    const candidate = candidates.find(c => c.posCodeId === posCodeId);
    return candidate?.position || `PosCode ${posCodeId}`;
  };

  // Get unique units for filter
  const uniqueUnits = Array.from(new Set(candidates.map(c => c.unit))).sort();

  const filteredCandidates = candidates.filter((c) => {
    // Filter by search term
    const matchesSearch = c.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.position.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.unit.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Filter by unit
    const matchesUnit = filterUnit === 'all' || c.unit === filterUnit;
    
    return matchesSearch && matchesUnit;
  });

  // Paginated data
  const paginatedCandidates = filteredCandidates.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  const handleChangePage = (newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (newRowsPerPage: number) => {
    setRowsPerPage(newRowsPerPage);
    setPage(0);
  };

  // Reset page when search or filter changes
  useEffect(() => {
    setPage(0);
  }, [searchTerm, filterUnit]);

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
      ModalProps={{
        sx: {
          zIndex: 1400, // สูงกว่า AppBar (1200)
        }
      }}
      PaperProps={{
        sx: { 
          width: { xs: '100%', sm: '90%', md: 700 }, 
          backgroundImage: 'none'
        }
      }}
      SlideProps={{
        timeout: { enter: 300, exit: 250 }
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Header */}
        <Box sx={{ 
          p: 1, 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          borderBottom: 1, 
          borderColor: 'divider',
          bgcolor: 'background.paper',
          position: 'sticky', 
          top: 0, 
          zIndex: 2,
        }}>
          <Box sx={{ lineHeight: 1, pl: 1.5 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.25 }}>
              เลือกผู้สมัคร
            </Typography>
            <Typography variant="caption" color="text.secondary">
              เลือกบุคลากรที่ต้องการเลื่อนขึ้นมาแทนตำแหน่งว่าง
            </Typography>
          </Box>
          <IconButton onClick={handleClose} size="small">
            <CloseIcon sx={{ fontSize: 20 }} />
          </IconButton>
        </Box>

        {/* Content */}
        <Box sx={{ flex: 1, overflow: 'auto', p: 1.5 }}>
        {/* Info Card */}
        <Paper elevation={0} sx={{ p: 1.5, mb: 1.5, bgcolor: 'primary.50', border: '1px solid', borderColor: 'primary.main' }}>
          <Typography variant="subtitle2" fontWeight={600} color="primary.main" gutterBottom>
            ข้อมูลตำแหน่งว่าง
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, mt: 1 }}>
            <Box>
              <Typography variant="caption" color="text.secondary">ตำแหน่ง</Typography>
              <Typography variant="body2" fontWeight={600}>{vacantPosition?.position}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">หน่วย</Typography>
              <Typography variant="body2" fontWeight={600}>{vacantPosition?.unit}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">ระดับ</Typography>
              <Typography variant="body2" fontWeight={600}>
                {getRankName(targetRankLevel)} (Level {targetRankLevel})
              </Typography>
            </Box>
          </Box>
        </Paper>

        {/* Search and Filter Bar */}
        <Box sx={{ mb: 1.5 }}>
          <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
            <TextField
              fullWidth
              placeholder="ค้นหา ชื่อ, ตำแหน่ง, หน่วย..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              size="small"
              autoFocus
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
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
            
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <Select
                value={filterUnit}
                onChange={(e: SelectChangeEvent) => setFilterUnit(e.target.value)}
                displayEmpty
                renderValue={(selected) => {
                  if (selected === 'all') {
                    return (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <FilterListIcon fontSize="small" />
                        <Typography variant="body2">ทุกหน่วย</Typography>
                      </Box>
                    );
                  }
                  return (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <FilterListIcon fontSize="small" />
                      <Typography variant="body2" noWrap>{selected}</Typography>
                    </Box>
                  );
                }}
                MenuProps={{
                  sx: { zIndex: 9999 },
                  PaperProps: {
                    sx: {
                      zIndex: 9999,
                      maxHeight: 300,
                    }
                  },
                  disablePortal: false,
                  anchorOrigin: {
                    vertical: 'bottom',
                    horizontal: 'left',
                  },
                  transformOrigin: {
                    vertical: 'top',
                    horizontal: 'left',
                  },
                }}
              >
                <MenuItem value="all">
                  <Typography variant="body2">ทุกหน่วย</Typography>
                </MenuItem>
                {vacantPosition && (
                  <MenuItem value={vacantPosition.unit}>
                    <Typography variant="body2" fontWeight={600} color="primary.main">
                      {vacantPosition.unit} (หน่วยเดียวกัน)
                    </Typography>
                  </MenuItem>
                )}
                <Divider />
                {uniqueUnits
                  .filter(unit => unit !== vacantPosition?.unit)
                  .map((unit) => (
                    <MenuItem key={unit} value={unit}>
                      <Typography variant="body2">{unit}</Typography>
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>
          </Box>
          
          {filteredCandidates.length > 0 && (
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="caption" color="text.secondary">
                พบ {filteredCandidates.length} รายการ • หน้า {page + 1}/{Math.ceil(filteredCandidates.length / rowsPerPage)}
              </Typography>
              <Typography variant="caption" color="primary.main" fontWeight={600}>
                Double-click เพื่อเลือกด่วน
              </Typography>
            </Box>
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
          <Typography variant="body2" color="text.secondary">ไม่พบผู้สมัคร</Typography>
        ) : (
          <Box>
            {paginatedCandidates.map((candidate, index) => (
              <Paper
                key={candidate.id}
                elevation={selectedCandidate?.id === candidate.id ? 2 : 0}
                sx={{ 
                  p: 1.5, 
                  mb: 1, 
                  cursor: 'pointer',
                  border: '2px solid',
                  borderColor: selectedCandidate?.id === candidate.id ? 'primary.main' : 'divider',
                  bgcolor: selectedCandidate?.id === candidate.id ? 'primary.50' : 'background.paper',
                  transition: 'all 0.15s',
                  '&:hover': {
                    borderColor: 'primary.main',
                    transform: 'translateX(4px)',
                    boxShadow: 2,
                  }
                }}
                onClick={() => setSelectedCandidate(candidate)}
                onDoubleClick={() => handleDoubleClick(candidate)}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
                  {/* Left: Compact Info */}
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" fontWeight={600} color="primary.main" noWrap>
                      {candidate.rank} {candidate.fullName}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1.5, mt: 0.25 }}>
                      <Typography variant="caption" color="text.secondary" noWrap>
                        {candidate.position}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" noWrap>
                        • {candidate.unit}
                      </Typography>
                      {candidate.seniority && (
                        <Typography variant="caption" color="text.secondary">
                          • {candidate.seniority}
                        </Typography>
                      )}
                    </Box>
                  </Box>

                  {/* Right: Select Indicator */}
                  <Box sx={{ flexShrink: 0 }}>
                    {selectedCandidate?.id === candidate.id ? (
                      <Box sx={{ 
                        width: 32, 
                        height: 32, 
                        borderRadius: '50%',
                        bgcolor: 'primary.main',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontSize: '14px',
                      }}>
                        ✓
                      </Box>
                    ) : (
                      <Box sx={{ 
                        width: 32, 
                        height: 32, 
                        borderRadius: '50%',
                        border: '2px solid',
                        borderColor: 'divider',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'text.disabled',
                        fontSize: '18px',
                      }}>
                        +
                      </Box>
                    )}
                  </Box>
                </Box>
              </Paper>
            ))}

            {/* Pagination */}
            {filteredCandidates.length > 0 && (
              <DataTablePagination
                count={filteredCandidates.length}
                page={page}
                rowsPerPage={rowsPerPage}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
                rowsPerPageOptions={[5, 10, 25, 50]}
                variant="minimal"
                dense
                showLabel={false}
                sx={{ py: { xs: 0.75, sm: 1 } }}
              />
            )}
          </Box>
        )}

        {/* Selected Summary - Minimized */}
        {selectedCandidate && (
          <Box sx={{ 
            mt: 1.5, 
            p: 1.5, 
            bgcolor: 'success.50', 
            borderRadius: 1,
            border: '2px solid', 
            borderColor: 'success.main' 
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ 
                width: 28, 
                height: 28, 
                borderRadius: '50%',
                bgcolor: 'success.main',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                flexShrink: 0,
                fontSize: '14px',
              }}>
                ✓
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body2" fontWeight={600} noWrap>
                  {selectedCandidate.rank} {selectedCandidate.fullName}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                  {selectedCandidate.position} → {vacantPosition?.position}
                </Typography>
              </Box>
            </Box>
          </Box>
        )}
        </Box>

        {/* Footer Actions */}
        <Box sx={{ 
          p: 1.5, 
          borderTop: 1, 
          borderColor: 'divider', 
          bgcolor: 'background.paper', 
          display: 'flex', 
          gap: 1.5, 
          justifyContent: 'space-between', 
          alignItems: 'center',
          boxShadow: '0 -2px 8px rgba(0,0,0,0.05)',
        }}>
          <Box sx={{ flex: 1 }}>
            {selectedCandidate ? (
              <Box>
                <Typography variant="body2" fontWeight={600} color="success.main" sx={{ fontSize: '0.875rem' }}>
                  ✓ เลือก: {selectedCandidate.fullName}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                  {selectedCandidate.rank} • {selectedCandidate.unit}
                </Typography>
              </Box>
            ) : (
              <Typography variant="caption" color="text.secondary">
                กรุณาเลือกผู้สมัคร 1 คน
              </Typography>
            )}
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button 
              onClick={handleClose} 
              variant="outlined"
              size="small"
            >
              ยกเลิก
            </Button>
            <Button
              variant="contained"
              color="primary"
              onClick={handleSelect}
              disabled={!selectedCandidate}
              size="small"
            >
              {selectedCandidate ? '✓ ยืนยัน' : 'ยืนยัน'}
            </Button>
          </Box>
        </Box>
      </Box>
    </Drawer>
  );
}
