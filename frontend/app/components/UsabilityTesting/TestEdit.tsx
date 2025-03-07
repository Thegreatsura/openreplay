import { Button, Input, Typography, Dropdown, Modal } from 'antd';
import { isValidUrl } from 'App/utils';
import React from 'react';
import {
  withSiteId,
  usabilityTesting,
  usabilityTestingView,
  usabilityTestingEdit,
} from 'App/routes';
import { useNavigate, useParams } from 'react-router';
import Breadcrumb from 'Shared/Breadcrumb';
import { EditOutlined, DeleteOutlined, MoreOutlined } from '@ant-design/icons';
import {Power, Info, ListTodo} from 'lucide-react';
import { useModal } from 'App/components/Modal';
import { observer } from 'mobx-react-lite';
import { useStore } from 'App/mstore';
import { confirm, NavPrompt } from 'UI';
import StepsModal from './StepsModal';
import SidePanel from './SidePanel';
import usePageTitle from 'App/hooks/usePageTitle';
import { toast } from 'react-toastify';

const menuItems = [
  {
    key: '1',
    label: 'Edit Title and Description',
    icon: <EditOutlined rev={undefined} />,
  },
  {
    key: '2',
    label: 'Delete',
    icon: <DeleteOutlined rev={undefined} />,
  },
];

function TestEdit() {
  // @ts-ignore
  const { siteId, testId } = useParams();
  const [hasChanged, setHasChanged] = React.useState(testId === 'new');
  const [typingEnabled, setTypingEnabled] = React.useState(true);
  const { uxtestingStore } = useStore();
  const [newTestTitle, setNewTestTitle] = React.useState('');
  const [newTestDescription, setNewTestDescription] = React.useState('');
  const [conclusion, setConclusion] = React.useState('');
  const [guidelines, setGuidelines] = React.useState('');
  const [isModalVisible, setIsModalVisible] = React.useState(false);
  const [isConclusionEditing, setIsConclusionEditing] = React.useState(false);
  const [isOverviewEditing, setIsOverviewEditing] = React.useState(false);

  const { showModal, hideModal } = useModal();
  const navigate = useNavigate()
  usePageTitle(`Usability Tests | ${uxtestingStore.instance ? 'Edit' : 'Create'}`);

  React.useEffect(() => {
    if (uxtestingStore.instanceCreationSiteId && siteId !== uxtestingStore.instanceCreationSiteId) {
      navigate(withSiteId(usabilityTesting(), siteId));
    }
  }, [siteId]);
  React.useEffect(() => {
    if (testId && testId !== 'new') {
      uxtestingStore.getTestData(testId).then((inst) => {
        if (inst) {
          setConclusion(inst.conclusionMessage || '');
          setGuidelines(inst.guidelines || '');
        }
      });
    } else {
      if (!uxtestingStore.instance) {
        navigate(withSiteId(usabilityTesting(), siteId));
      } else {
        setConclusion(uxtestingStore.instance!.conclusionMessage);
        setGuidelines(uxtestingStore.instance!.guidelines);
      }
    }
  }, []);
  if (!uxtestingStore.instance) {
    return <div>Loading...</div>;
  }

  const onSave = (isPreview?: boolean) => {
    setHasChanged(false);
    if (testId && testId !== 'new') {
      uxtestingStore.updateTest(uxtestingStore.instance!, isPreview).then((testId) => {
        if (isPreview) {
          window.open(
            `${uxtestingStore.instance!.startingPath}?oruxt=${testId}`,
            '_blank',
            'noopener,noreferrer'
          );
        } else {
          toast.success('The usability test is now live and accessible to participants.');
          navigate(withSiteId(usabilityTestingView(testId!.toString()), siteId));
        }
      });
    } else {
      uxtestingStore.createNewTest(isPreview).then((test) => {
        if (isPreview) {
          window.open(`${test.startingPath}?oruxt=${test.testId}`, '_blank', 'noopener,noreferrer');
          navigate(withSiteId(usabilityTestingEdit(test.testId), siteId), { replace: true });
        } else {
          navigate(withSiteId(usabilityTestingView(test.testId), siteId));
        }
      });
    }
  };

  const onClose = (confirmed: boolean) => {
    if (confirmed) {
      uxtestingStore.instance!.setProperty('title', newTestTitle);
      uxtestingStore.instance!.setProperty('description', newTestDescription);
    }
    setNewTestDescription('');
    setNewTestTitle('');
    setIsModalVisible(false);
  };

  const onMenuClick = async ({ key }: { key: string }) => {
    if (key === '1') {
      setNewTestTitle(uxtestingStore.instance!.title);
      setNewTestDescription(uxtestingStore.instance!.description);
      setIsModalVisible(true);
    }
    if (key === '2') {
      if (
        await confirm({
          confirmation:
            'Are you sure you want to delete this usability test? This action cannot be undone.',
        })
      ) {
        uxtestingStore.deleteTest(testId).then(() => {
          navigate(withSiteId(usabilityTesting(), siteId));
        });
      }
    }
  };

  const isPublished =
    uxtestingStore.instance.status !== undefined && uxtestingStore.instance.status !== 'preview';
  const isStartingPointValid = isValidUrl(uxtestingStore.instance.startingPath);

  return (
    <div className="w-full mx-auto" style={{ maxWidth: '1360px' }}>
      <Breadcrumb
        items={[
          {
            label: 'Usability Testing',
            to: withSiteId(usabilityTesting(), siteId),
          },
          {
            label: uxtestingStore.instance.title,
            to: isPublished ? withSiteId(usabilityTestingView(testId), siteId) : undefined,
          },
          {
            label: isPublished ? 'Create' : 'Edit',
          },
        ]}
      />
      <NavPrompt
        when={hasChanged}
        message={() => {
          return 'You have unsaved changes. Are you sure you want to leave?';
        }}
      />
      <Modal
        title="Edit Test"
        open={isModalVisible}
        onOk={() => onClose(true)}
        onCancel={() => onClose(false)}
        footer={
          <Button type={'primary'} onClick={() => onClose(true)}>
            Save
          </Button>
        }
      >
        <Typography.Text strong>Title</Typography.Text>
        <Input
          placeholder="E.g. Checkout user journey evaluation"
          style={{ marginBottom: '2em' }}
          value={newTestTitle}
          onChange={(e) => {
            setHasChanged(true);
            setNewTestTitle(e.target.value);
          }}
        />
        <Typography.Text strong>Test Objective (optional)</Typography.Text>
        <Input.TextArea
          value={newTestDescription}
          rows={6}
          onChange={(e) => {
            setHasChanged(true);
            setNewTestDescription(e.target.value);
          }}
          placeholder="Share a brief statement about what you aim to discover through this study."
        />
      </Modal>
      <div className={'grid grid-cols-4 gap-2'}>
        <div className={'flex w-full flex-col gap-2 col-span-3'}>
          <div className={'flex items-start p-4 rounded-lg bg-white shadow-sm justify-between'}>
            <div>
              <Typography.Title level={4}>{uxtestingStore.instance.title}</Typography.Title>
              <Typography.Text>{uxtestingStore.instance.description}</Typography.Text>
            </div>
            <div>
              <Dropdown menu={{ items: menuItems, onClick: onMenuClick }}>
                <Button icon={<MoreOutlined rev={undefined} />}></Button>
              </Dropdown>
            </div>
          </div>

          <div className={'p-4 rounded-lg bg-white shadow-sm flex flex-col gap-2'}>
              <Typography.Title level={5} className='flex gap-2 items-center'>
                <Power size={16} /> Starting point
              </Typography.Title>
              <Input
                style={{ width: 400 }}
                type={'url'}
                disabled={isPublished}
                placeholder={'yoursite.com/example-page'}
                value={uxtestingStore.instance!.startingPath.replace('https://', '')}
                addonBefore="https://"
                onChange={(e) => {
                  setHasChanged(true);
                  let value = e.target.value;
                  if (value.startsWith('https://')) {
                    value = value.replace('https://', '');
                  }
                  uxtestingStore.instance!.setProperty('startingPath', 'https://' + value);
                }}
              />
              {uxtestingStore.instance!.startingPath === 'https://' || isStartingPointValid ? (
                <Typography.Text className='text-sm'>
                  The test will start on this page. A special link from this will be created for you to share with participants only.
                </Typography.Text>
              ) : (
                <Typography.Text className='text-sm text-red-600'>Invalid starting point.</Typography.Text>
              )}
            </div>



          <div className={'p-4 rounded-lg bg-white shadow-sm flex flex-col gap-2'}>
            <Typography.Title level={5} className='flex gap-2 items-center'>
            <Info size={16} /> Introduction and Guidelines for Participants
            </Typography.Title>
            <Typography.Text></Typography.Text>
            {isOverviewEditing ? (
              <Input.TextArea
                autoFocus
                rows={6}
                placeholder={
                  'Enter a brief introduction to the test and its goals here. Follow with clear, step-by-step guidelines for participants.'
                }
                value={guidelines}
                onChange={(e) => {
                  setHasChanged(true);
                  setGuidelines(e.target.value);
                }}
              />
            ) : (
              <div className={'whitespace-pre-wrap'}>
                {uxtestingStore.instance?.guidelines?.length
                  ? uxtestingStore.instance.guidelines
                  : 'Provide an overview of this usability test to and input guidelines that can be of assistance to users at any point during the test.'}
              </div>
            )}
            <div className={'flex gap-2'}>
              {isOverviewEditing ? (
                <>
                  <Button
                    type={'primary'}
                    onClick={() => {
                      uxtestingStore.instance!.setProperty('guidelines', guidelines);
                      setIsOverviewEditing(false);
                    }}
                  >
                    Save
                  </Button>
                  <Button
                    onClick={() => {
                      setIsOverviewEditing(false);
                      setGuidelines(uxtestingStore.instance?.guidelines || '');
                    }}
                  >
                    Cancel
                  </Button>
                </>
              ) : (
                <Button type={'link'} onClick={() => setIsOverviewEditing(true)} className='px-0'>
                  {uxtestingStore.instance?.guidelines?.length ? 'Edit' : 'Specify Guidelines'}
                </Button>
              )}
            </div>
          </div>

          <div className={'p-4 rounded-lg bg-white shadow-sm flex flex-col gap-2'}>
            <Typography.Title level={5} className='flex gap-2 items-center'><ListTodo size={16} /> Tasks</Typography.Title>
            {uxtestingStore.instance!.tasks.map((task, index) => (
              <Step
                ind={index}
                title={task.title}
                description={task.description}
                buttons={
                  <>
                    <Button
                      size={'small'}
                      disabled={isPublished}
                      icon={<EditOutlined rev={undefined} />}
                      onClick={() => {
                        showModal(
                          <StepsModal
                            editTask={task}
                            onHide={hideModal}
                            onAdd={(task) => {
                              setHasChanged(true);
                              const tasks = [...uxtestingStore.instance!.tasks];
                              tasks[index] = task;
                              uxtestingStore.instance!.setProperty('tasks', tasks);
                            }}
                          />,
                          { right: true, width: 600 }
                        );
                      }}
                    />
                    <Button
                      onClick={() => {
                        setHasChanged(true);
                        uxtestingStore.instance!.setProperty(
                          'tasks',
                          uxtestingStore.instance!.tasks.filter(
                            (t) => t.title !== task.title && t.description !== task.description
                          )
                        );
                      }}
                      disabled={isPublished}
                      size={'small'}
                      icon={<DeleteOutlined rev={undefined} />}
                    />
                  </>
                }
              />
            ))}
            <div>
              <Button
                type={'primary'}
                ghost
                disabled={isPublished}
                onClick={() =>
                  showModal(
                    <StepsModal
                      typingEnabled={typingEnabled}
                      onHide={hideModal}
                      onAdd={(task) => {
                        setHasChanged(true);
                        setTypingEnabled(task.allowTyping);
                        uxtestingStore.instance!.setProperty('tasks', [
                          ...uxtestingStore.instance!.tasks,
                          task,
                        ]);
                      }}
                    />,
                    { right: true, width: 600 }
                  )
                }
              >
                Add a task or question
              </Button>
            </div>
          </div>

          <div className={'p-4 rounded bg-white border flex flex-col gap-2'}>
            <Typography.Title level={5}>🎉 Conclusion</Typography.Title>
            <div>
              {isConclusionEditing ? (
                <Input.TextArea
                  placeholder={
                    'Enter your closing remarks here, thanking participants for their time and contributions.'
                  }
                  value={conclusion}
                  onChange={(e) => {
                    setHasChanged(true);
                    setConclusion(e.target.value);
                  }}
                />
              ) : (
                <Typography.Text>{uxtestingStore.instance!.conclusionMessage}</Typography.Text>
              )}
            </div>
            <div className={'flex gap-2'}>
              {isConclusionEditing ? (
                <>
                  <Button
                    type={'primary'}
                    onClick={() => {
                      uxtestingStore.instance!.setProperty('conclusionMessage', conclusion);
                      setIsConclusionEditing(false);
                    }}
                  >
                    Save
                  </Button>
                  <Button
                    onClick={() => {
                      setIsConclusionEditing(false);
                      setConclusion(uxtestingStore.instance?.conclusionMessage || '');
                    }}
                  >
                    Cancel
                  </Button>
                </>
              ) : (
                <Button type={'link'} className='px-0' onClick={() => setIsConclusionEditing(true)}>
                  Edit
                </Button>
              )}
            </div>
          </div>
        </div>
        <SidePanel
          isStartingPointValid={isStartingPointValid}
          taskLen={uxtestingStore.instance.tasks.length}
          onSave={() => onSave(false)}
          onPreview={() => onSave(true)}
        />
      </div>
    </div>
  );
}

export function Step({
  buttons,
  ind,
  title,
  description,
  hover,
}: {
  buttons?: React.ReactNode;
  ind: number;
  title: string;
  description: string | null;
  hover?: boolean;
}) {
  const safeTitle = title.length > 120 ? title.slice(0, 120) + '...' : title;
  const safeDescription =
    description && description?.length > 300 ? description.slice(0, 300) + '...' : description;
  return (
    <div
      className={`p-4 rounded-lg  ${
        hover ? 'bg-white hover:border hover:border-indigo-500' : ''
      }bg-active-blue flex items-start gap-2 shadow-sm`}
    >
      <div
        style={{ minWidth: '1.5rem' }}
        className={'w-6 h-6 bg-white rounded-full flex items-center justify-center'}
      >
        {ind + 1}
      </div>

      <div className={'overflow-hidden overflow-ellipsis'}>
        <Typography.Text>{safeTitle}</Typography.Text>
        <div className={'text-disabled-text'}>{safeDescription}</div>
      </div>

      <div className={'ml-auto'} />
      <div className={'flex items-center gap-2'} style={{ minWidth: '4rem' }}>
        {buttons}
      </div>
    </div>
  );
}

export default observer(TestEdit);
